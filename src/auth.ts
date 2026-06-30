import { OAUTH_TOKEN_URL } from "./config.js";
import { readTokens, writeTokens, type StoredTokens } from "./store.js";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

/** Refresh ~60s before the real expiry to avoid races against the clock. */
const EXPIRY_SKEW_MS = 60_000;

/**
 * Strategy for producing an Authorization header value. OAuth refreshes and
 * caches access tokens; API-key mode returns a static Basic header.
 */
export interface AuthProvider {
  /** Returns the value for the `Authorization` header. */
  getAuthHeader(): Promise<string>;
  /** Force a token refresh (e.g. after a 401). No-op for API-key auth. */
  invalidate(): Promise<void>;
}

export class ApiKeyAuthProvider implements AuthProvider {
  private readonly header: string;
  constructor(apiKey: string) {
    // Campaign Monitor Basic auth: API key as username, any string as password.
    this.header = "Basic " + Buffer.from(`${apiKey}:x`).toString("base64");
  }
  async getAuthHeader(): Promise<string> {
    return this.header;
  }
  async invalidate(): Promise<void> {
    /* nothing to refresh */
  }
}

export class OAuthAuthProvider implements AuthProvider {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private refreshToken: string;
  private accessToken?: string;
  private expiresAt = 0;
  private inflight?: Promise<void>;

  constructor(opts: {
    clientId: string;
    clientSecret: string;
    /** Seed refresh token (from env) used only if the store is empty. */
    seedRefreshToken: string;
  }) {
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;

    const stored = readTokens();
    if (stored) {
      this.refreshToken = stored.refreshToken;
      this.accessToken = stored.accessToken;
      this.expiresAt = stored.accessTokenExpiresAt ?? 0;
    } else {
      this.refreshToken = opts.seedRefreshToken;
      this.persist();
    }
  }

  async getAuthHeader(): Promise<string> {
    if (!this.accessToken || Date.now() >= this.expiresAt - EXPIRY_SKEW_MS) {
      await this.refresh();
    }
    return `Bearer ${this.accessToken}`;
  }

  async invalidate(): Promise<void> {
    this.accessToken = undefined;
    this.expiresAt = 0;
    await this.refresh();
  }

  /** Exchange the refresh token for a fresh access token (deduped). */
  private async refresh(): Promise<void> {
    if (this.inflight) return this.inflight;
    this.inflight = this.doRefresh().finally(() => {
      this.inflight = undefined;
    });
    return this.inflight;
  }

  private async doRefresh(): Promise<void> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshToken,
    });

    const res = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `OAuth token refresh failed (HTTP ${res.status}). ${text}\n` +
          "The stored refresh token may be expired or revoked — re-run `npm run auth`.",
      );
    }

    const data = (await res.json()) as TokenResponse;
    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + data.expires_in * 1000;
    // Campaign Monitor rotates the refresh token on every refresh; keep the new one.
    if (data.refresh_token) this.refreshToken = data.refresh_token;
    this.persist();
  }

  private persist(): void {
    const tokens: StoredTokens = {
      refreshToken: this.refreshToken,
      accessToken: this.accessToken,
      accessTokenExpiresAt: this.expiresAt,
    };
    try {
      writeTokens(tokens);
    } catch (err) {
      console.error("[campaign-monitor-mcp] Failed to persist tokens:", err);
    }
  }
}
