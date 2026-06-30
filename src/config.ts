import "dotenv/config";

export const API_BASE = "https://api.createsend.com/api/v3.3";
export const OAUTH_AUTHORIZE_URL = "https://api.createsend.com/oauth";
export const OAUTH_TOKEN_URL = "https://api.createsend.com/oauth/token";

export const ALL_CATEGORIES = [
  "account",
  "clients",
  "campaigns",
  "lists",
  "segments",
  "subscribers",
  "templates",
  "transactional",
  "journeys",
] as const;

export type Category = (typeof ALL_CATEGORIES)[number];

export const DEFAULT_SCOPES = [
  "ManageLists",
  "CreateCampaigns",
  "SendCampaigns",
  "ImportSubscribers",
  "ManageTemplates",
  "ViewReports",
  "ViewTransactional",
  "SendTransactional",
  "ManageSubscriberData",
].join(",");

export type AuthMode =
  | { mode: "oauth"; clientId: string; clientSecret: string; refreshToken: string }
  | { mode: "apikey"; apiKey: string };

export interface Config {
  auth: AuthMode;
  enabledCategories: Category[];
}

function parseCategories(raw: string | undefined): Category[] {
  if (!raw || !raw.trim()) return [...ALL_CATEGORIES];
  const requested = raw
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  const valid = requested.filter((c): c is Category =>
    (ALL_CATEGORIES as readonly string[]).includes(c),
  );
  const invalid = requested.filter((c) => !valid.includes(c as Category));
  if (invalid.length) {
    console.error(
      `[campaign-monitor-mcp] Ignoring unknown CM_ENABLED_CATEGORIES values: ${invalid.join(", ")}`,
    );
  }
  return valid.length ? valid : [...ALL_CATEGORIES];
}

/**
 * Load and validate configuration from the environment. Prefers OAuth; falls
 * back to an API key. Throws a descriptive error if neither is configured.
 */
export function loadConfig(): Config {
  const clientId = process.env.CM_CLIENT_ID?.trim();
  const clientSecret = process.env.CM_CLIENT_SECRET?.trim();
  const refreshToken = process.env.CM_REFRESH_TOKEN?.trim();
  const apiKey = process.env.CM_API_KEY?.trim();

  const enabledCategories = parseCategories(process.env.CM_ENABLED_CATEGORIES);

  if (clientId && clientSecret && refreshToken) {
    return {
      auth: { mode: "oauth", clientId, clientSecret, refreshToken },
      enabledCategories,
    };
  }

  if (apiKey) {
    return { auth: { mode: "apikey", apiKey }, enabledCategories };
  }

  throw new Error(
    "No Campaign Monitor credentials found. Set CM_CLIENT_ID, CM_CLIENT_SECRET and " +
      "CM_REFRESH_TOKEN (run `npm run auth` to obtain a refresh token), or set CM_API_KEY.",
  );
}
