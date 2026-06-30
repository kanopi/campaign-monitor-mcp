import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CMError } from "./errors.js";
import type { CMClient } from "./client.js";
import type { Category } from "./config.js";
import type { ToolDef } from "./types.js";

/**
 * Register the given tools on the MCP server, filtered to the enabled
 * categories. Each handler's result is serialized to a JSON text block;
 * CMErrors (and any thrown error) become an `isError` tool result.
 */
export function registerTools(
  server: McpServer,
  tools: ToolDef[],
  client: CMClient,
  enabledCategories: Category[],
): number {
  const enabled = new Set(enabledCategories);
  let count = 0;

  for (const tool of tools) {
    if (!enabled.has(tool.category)) continue;
    count++;

    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { title: tool.name, ...tool.annotations },
      },
      async (args: Record<string, unknown>) => {
        try {
          const result = await tool.handler(args ?? {}, client);
          return {
            content: [
              { type: "text" as const, text: stringify(result) },
            ],
          };
        } catch (err) {
          const message =
            err instanceof CMError
              ? err.toSummary()
              : err instanceof Error
                ? err.message
                : String(err);
          return {
            isError: true,
            content: [{ type: "text" as const, text: `Error: ${message}` }],
          };
        }
      },
    );
  }

  return count;
}

function stringify(value: unknown): string {
  if (value === undefined) return "(no content)";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}
