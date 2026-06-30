/**
 * One-time OAuth bootstrap CLI.
 *
 *   npm run auth
 *
 * Opens the Campaign Monitor consent screen, captures the authorization code on
 * a local redirect server, exchanges it for tokens, prints the refresh token,
 * and writes it to the token store so the MCP server can use it immediately.
 */
import "dotenv/config";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { OAUTH_AUTHORIZE_URL, OAUTH_TOKEN_URL, DEFAULT_SCOPES } from "./config.js";
import { writeTokens } from "./store.js";

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Missing required env var ${name}. Set it in .env first.`);
    process.exit(1);
  }
  return v;
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    /* fall back to manual open */
  }
}

async function main(): Promise<void> {
  const clientId = required("CM_CLIENT_ID");
  const clientSecret = required("CM_CLIENT_SECRET");
  const redirectUri = process.env.CM_REDIRECT_URI?.trim() || "http://127.0.0.1:53682/callback";
  const scopes = process.env.CM_SCOPES?.trim() || DEFAULT_SCOPES;

  const redirect = new URL(redirectUri);
  const port = Number(redirect.port) || 53682;
  const callbackPath = redirect.pathname || "/callback";
  const state = `cm-${Math.abs(hashCode(clientId + scopes))}`;

  const authorizeUrl = new URL(OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("type", "web_server");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", scopes);
  authorizeUrl.searchParams.set("state", state);

  const code: string = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (!req.url) return;
      const reqUrl = new URL(req.url, `http://127.0.0.1:${port}`);
      if (reqUrl.pathname !== callbackPath) {
        res.writeHead(404).end("Not found");
        return;
      }
      const err = reqUrl.searchParams.get("error");
      const returnedCode = reqUrl.searchParams.get("code");
      const returnedState = reqUrl.searchParams.get("state");

      const finish = (html: string) => {
        res.writeHead(200, { "Content-Type": "text/html" }).end(html);
        server.close();
      };

      if (err) {
        finish(`<h1>Authorization failed</h1><p>${escapeHtml(err)}</p>`);
        reject(new Error(`Authorization denied: ${err}`));
        return;
      }
      if (returnedState !== state) {
        finish("<h1>State mismatch</h1><p>Possible CSRF. Try again.</p>");
        reject(new Error("State parameter mismatch."));
        return;
      }
      if (!returnedCode) {
        finish("<h1>No code returned</h1>");
        reject(new Error("No authorization code in callback."));
        return;
      }
      finish(
        "<h1>✅ Authorized</h1><p>You can close this tab and return to the terminal.</p>",
      );
      resolve(returnedCode);
    });

    server.on("error", reject);
    server.listen(port, () => {
      console.log("\nCampaign Monitor OAuth setup");
      console.log("────────────────────────────");
      console.log(`Listening for the redirect on ${redirectUri}\n`);
      console.log("Opening your browser to authorize. If it doesn't open, visit:\n");
      console.log(authorizeUrl.toString() + "\n");
      openBrowser(authorizeUrl.toString());
    });
  });

  console.log("\nAuthorization code received. Exchanging for tokens…");

  const tokenRes = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    console.error(`\nToken exchange failed (HTTP ${tokenRes.status}): ${text}`);
    process.exit(1);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token: string;
  };

  writeTokens({
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
  });

  console.log("\n✅ Success! Tokens stored.\n");
  console.log("Add this to your .env (and keep it secret):\n");
  console.log(`CM_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  console.log(
    "The server will use the token store automatically; the .env value is a backup seed.",
  );
  process.exit(0);
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

main().catch((err) => {
  console.error("\nOAuth setup error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
