import { z } from "zod";
import type { ToolDef } from "../types.js";
import { pagingShape, dateShape, pagingQuery } from "./common.js";

const RO = { readOnlyHint: true } as const;
const listId = z.string().describe("List ID the segment belongs to.");
const segmentId = z.string().describe("Segment ID.");

const ruleGroups = z
  .array(
    z.object({
      Rules: z
        .array(
          z.object({
            RuleType: z
              .string()
              .describe("Rule type, e.g. 'EmailAddress', 'Name', 'DateSubscribed', or a custom field name."),
            Clause: z.string().describe("Rule clause, e.g. 'EQUALS gmail.com' or 'PROVIDED'."),
          }),
        )
        .describe("Rules combined with AND within this group."),
    }),
  )
  .describe("Rule groups combined with OR.");

export const segmentTools: ToolDef[] = [
  {
    name: "cm_create_segment",
    description: "Create a new segment on a list with the given rule groups.",
    category: "segments",
    inputSchema: {
      listId,
      Title: z.string().describe("Segment title."),
      RuleGroups: ruleGroups,
    },
    handler: (a, c) =>
      c.post(`/segments/${a.listId}`, { Title: a.Title, RuleGroups: a.RuleGroups }),
  },
  {
    name: "cm_update_segment",
    description: "Update a segment's title and replace its rule groups.",
    category: "segments",
    inputSchema: {
      segmentId,
      Title: z.string().describe("New segment title."),
      RuleGroups: ruleGroups,
    },
    annotations: { idempotentHint: true },
    handler: (a, c) =>
      c.put(`/segments/${a.segmentId}`, { Title: a.Title, RuleGroups: a.RuleGroups }),
  },
  {
    name: "cm_add_segment_rulegroup",
    description: "Add a rule group to an existing segment without removing current rules.",
    category: "segments",
    inputSchema: {
      segmentId,
      Rules: z
        .array(
          z.object({
            RuleType: z.string().describe("Rule type."),
            Clause: z.string().describe("Rule clause."),
          }),
        )
        .describe("Rules (AND-combined) for the new rule group."),
    },
    handler: (a, c) => c.post(`/segments/${a.segmentId}/rules`, { Rules: a.Rules }),
  },
  {
    name: "cm_get_segment",
    description: "Get a segment's name, list ID, and active subscriber count.",
    category: "segments",
    inputSchema: { segmentId },
    annotations: RO,
    handler: (a, c) => c.get(`/segments/${a.segmentId}`),
  },
  {
    name: "cm_get_segment_subscribers",
    description: "Get the active subscribers matching a segment's rules (paged).",
    category: "segments",
    inputSchema: { segmentId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: (a, c) => c.get(`/segments/${a.segmentId}/active`, pagingQuery(a)),
  },
  {
    name: "cm_clear_segment_rules",
    description: "⚠️ Clear all rules and rule groups from a segment.",
    category: "segments",
    inputSchema: { segmentId },
    annotations: { destructiveHint: true },
    handler: (a, c) => c.delete(`/segments/${a.segmentId}/rules`),
  },
  {
    name: "cm_delete_segment",
    description: "⚠️ Delete a segment from its list.",
    category: "segments",
    inputSchema: { segmentId },
    annotations: { destructiveHint: true },
    handler: (a, c) => c.delete(`/segments/${a.segmentId}`),
  },
];
