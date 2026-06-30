#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ApiKeyAuthProvider, OAuthAuthProvider, type AuthProvider } from "./auth.js";
import { CMClient } from "./client.js";
import { registerTools } from "./register.js";
import { allTools } from "./tools/index.js";

function buildAuthProvider(config: ReturnType<typeof loadConfig>): AuthProvider {
  if (config.auth.mode === "oauth") {
    return new OAuthAuthProvider({
      clientId: config.auth.clientId,
      clientSecret: config.auth.clientSecret,
      seedRefreshToken: config.auth.refreshToken,
    });
  }
  return new ApiKeyAuthProvider(config.auth.apiKey);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const auth = buildAuthProvider(config);
  const client = new CMClient(auth);

  const server = new McpServer({
    name: "campaign-monitor-mcp",
    version: "0.1.0",
  });

  const registered = registerTools(server, allTools, client, config.enabledCategories);

  // Log to stderr only — stdout is the MCP transport channel.
  console.error(
    `[campaign-monitor-mcp] Ready: ${registered} tools across [${config.enabledCategories.join(", ")}] ` +
      `(auth: ${config.auth.mode}).`,
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[campaign-monitor-mcp] Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
