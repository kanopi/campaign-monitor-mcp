/**
 * Smoke test: exercises auth + two read endpoints without the MCP layer.
 *
 *   npm run smoke
 *
 * Confirms credentials resolve, the access token refreshes, and authenticated
 * reads succeed. Performs no writes.
 */
import "dotenv/config";
import { loadConfig } from "./config.js";
import { ApiKeyAuthProvider, OAuthAuthProvider, type AuthProvider } from "./auth.js";
import { CMClient } from "./client.js";

async function main(): Promise<void> {
  const config = loadConfig();
  console.log(`Auth mode: ${config.auth.mode}`);

  const auth: AuthProvider =
    config.auth.mode === "oauth"
      ? new OAuthAuthProvider({
          clientId: config.auth.clientId,
          clientSecret: config.auth.clientSecret,
          seedRefreshToken: config.auth.refreshToken,
        })
      : new ApiKeyAuthProvider(config.auth.apiKey);

  const client = new CMClient(auth);

  console.log("\nGET /clients …");
  const clients = await client.get("/clients");
  console.log(JSON.stringify(clients, null, 2));

  console.log("\nGET /billingdetails …");
  const billing = await client.get("/billingdetails");
  console.log(JSON.stringify(billing, null, 2));

  console.log("\n✅ Smoke test passed.");
}

main().catch((err) => {
  console.error("\n❌ Smoke test failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
