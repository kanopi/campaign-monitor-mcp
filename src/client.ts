import { API_BASE } from "./config.js";
import { toCMError, CMError } from "./errors.js";
import type { AuthProvider } from "./auth.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface RequestOptions {
  /** Query string parameters. Undefined/null values are dropped. */
  query?: Record<string, unknown>;
  /** JSON request body for POST/PUT. */
  body?: unknown;
  /**
   * Append the `.json` format suffix to the path. True for most v3.3
   * resources; false for transactional endpoints which are JSON by default.
   */
  appendJson?: boolean;
}

const MAX_RETRIES = 1;

/**
 * Thin wrapper over the Campaign Monitor REST API. Handles auth headers,
 * the `.json` suffix, query serialization, error mapping, one 401-driven
 * token refresh retry, and one 429 (rate-limit) retry honoring Retry-After.
 */
export class CMClient {
  constructor(private readonly auth: AuthProvider) {}

  get(path: string, query?: Record<string, unknown>, appendJson = true) {
    return this.request("GET", path, { query, appendJson });
  }
  post(path: string, body?: unknown, query?: Record<string, unknown>, appendJson = true) {
    return this.request("POST", path, { body, query, appendJson });
  }
  put(path: string, body?: unknown, query?: Record<string, unknown>, appendJson = true) {
    return this.request("PUT", path, { body, query, appendJson });
  }
  delete(path: string, query?: Record<string, unknown>, appendJson = true) {
    return this.request("DELETE", path, { query, appendJson });
  }

  async request(
    method: HttpMethod,
    path: string,
    opts: RequestOptions = {},
  ): Promise<unknown> {
    const url = this.buildUrl(path, opts);
    let attempt = 0;
    let triedRefresh = false;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const authHeader = await this.auth.getAuthHeader();
      const headers: Record<string, string> = {
        Authorization: authHeader,
        Accept: "application/json",
      };
      const init: RequestInit = { method, headers };
      if (opts.body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(opts.body);
      }

      const res = await fetch(url, init);

      // Refresh once on an expired/invalid access token.
      if (res.status === 401 && !triedRefresh) {
        triedRefresh = true;
        await this.auth.invalidate();
        continue;
      }

      // Honor rate limiting with a single bounded retry.
      if (res.status === 429 && attempt < MAX_RETRIES) {
        attempt++;
        const retryAfter = Number(res.headers.get("Retry-After")) || 5;
        await delay(retryAfter * 1000);
        continue;
      }

      const payload = await parseBody(res);

      if (!res.ok) {
        throw toCMError(res.status, payload);
      }
      return payload;
    }
  }

  private buildUrl(path: string, opts: RequestOptions): string {
    const appendJson = opts.appendJson ?? true;
    let p = path.startsWith("/") ? path : `/${path}`;
    if (appendJson && !/\.(json|xml)$/.test(p)) p = `${p}.json`;

    const url = new URL(API_BASE + p);
    if (opts.query) {
      for (const [key, value] of Object.entries(opts.query)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return { success: true };
  const text = await res.text();
  if (!text) return { success: true };
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { CMError };
