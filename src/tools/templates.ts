import { z } from "zod";
import type { ToolDef } from "../types.js";

const RO = { readOnlyHint: true } as const;
const templateId = z.string().describe("Template ID.");

export const templateTools: ToolDef[] = [
  {
    name: "cm_get_template",
    description: "Get the basic details of a template (name, preview URLs, screenshot).",
    category: "templates",
    inputSchema: { templateId },
    annotations: RO,
    handler: (a, c) => c.get(`/templates/${a.templateId}`),
  },
  {
    name: "cm_create_template",
    description: "Create a new template for a client from hosted HTML (and optional ZIP of assets).",
    category: "templates",
    inputSchema: {
      clientId: z.string().describe("Client ID to create the template under."),
      Name: z.string().describe("Template name."),
      HtmlPageURL: z.string().url().describe("Publicly accessible URL of the template HTML."),
      ZipFileURL: z
        .string()
        .url()
        .optional()
        .describe("Optional URL of a ZIP file containing template images/assets."),
    },
    handler: (a, c) =>
      c.post(`/templates/${a.clientId}`, {
        Name: a.Name,
        HtmlPageURL: a.HtmlPageURL,
        ZipFileURL: a.ZipFileURL,
      }),
  },
  {
    name: "cm_update_template",
    description: "Update an existing template's name and file URLs.",
    category: "templates",
    inputSchema: {
      templateId,
      Name: z.string().describe("Template name."),
      HtmlPageURL: z.string().url().describe("URL of the template HTML."),
      ZipFileURL: z.string().url().optional().describe("Optional URL of a ZIP of assets."),
    },
    annotations: { idempotentHint: true },
    handler: (a, c) =>
      c.put(`/templates/${a.templateId}`, {
        Name: a.Name,
        HtmlPageURL: a.HtmlPageURL,
        ZipFileURL: a.ZipFileURL,
      }),
  },
  {
    name: "cm_copy_template",
    description: "Copy a template to a nominated destination client.",
    category: "templates",
    inputSchema: {
      templateId,
      DestinationClientID: z.string().describe("Client ID to copy the template into."),
      Name: z.string().optional().describe("Name for the copied template (defaults to the original)."),
    },
    handler: (a, c) =>
      c.post(`/templates/${a.templateId}/copy`, {
        DestinationClientID: a.DestinationClientID,
        Name: a.Name,
      }),
  },
  {
    name: "cm_delete_template",
    description: "⚠️ Delete a template.",
    category: "templates",
    inputSchema: { templateId },
    annotations: { destructiveHint: true },
    handler: (a, c) => c.delete(`/templates/${a.templateId}`),
  },
];
