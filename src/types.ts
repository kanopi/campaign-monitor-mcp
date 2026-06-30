import type { ZodRawShape } from "zod";
import type { CMClient } from "./client.js";
import type { Category } from "./config.js";

/** A single MCP tool mapped 1:1 to a Campaign Monitor API endpoint. */
export interface ToolDef {
  /** Tool name, e.g. "cm_list_clients". */
  name: string;
  /** Human/LLM-facing description; destructive ops are flagged in the text. */
  description: string;
  /** Category for env-based filtering. */
  category: Category;
  /** Zod raw shape (object of field schemas) describing the arguments. */
  inputSchema: ZodRawShape;
  /** Executes the endpoint call and returns the raw API result. */
  handler: (args: Record<string, unknown>, client: CMClient) => Promise<unknown>;
  /** MCP tool annotations (read-only / destructive hints for clients). */
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };
}

/** Convenience for defining a list of tools in a category module. */
export type ToolList = ToolDef[];
