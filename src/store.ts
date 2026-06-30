import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface StoredTokens {
  refreshToken: string;
  accessToken?: string;
  /** Epoch milliseconds at which the access token expires. */
  accessTokenExpiresAt?: number;
}

/**
 * Resolve the token store path. Campaign Monitor rotates refresh tokens on each
 * refresh, so the latest refresh token must be persisted somewhere durable.
 */
export function tokenStorePath(): string {
  const override = process.env.CM_TOKEN_STORE?.trim();
  if (override) return override;
  return join(homedir(), ".campaign-monitor-mcp", "tokens.json");
}

export function readTokens(path = tokenStorePath()): StoredTokens | undefined {
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as StoredTokens;
    if (parsed && typeof parsed.refreshToken === "string") return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}

export function writeTokens(tokens: StoredTokens, path = tokenStorePath()): void {
  mkdirSync(dirname(path), { recursive: true });
  // Restrict permissions — the file holds long-lived credentials.
  writeFileSync(path, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}
