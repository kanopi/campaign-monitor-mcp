import { z } from "zod";
import type { ToolDef } from "../types.js";
import { pagingShape, dateShape, pagingQuery } from "./common.js";

const RO = { readOnlyHint: true } as const;
const clientId = z.string().describe("Client ID that owns the list.");
const listId = z.string().describe("List ID.");
const enc = (s: unknown) => encodeURIComponent(String(s));

const subscriberReport = (segment: string): ToolDef["handler"] => (a, c) =>
  c.get(`/lists/${a.listId}/${segment}`, pagingQuery(a));

export const listTools: ToolDef[] = [
  {
    name: "cm_create_list",
    description: "Create a new subscriber list for a client.",
    category: "lists",
    inputSchema: {
      clientId,
      Title: z.string().describe("List title."),
      UnsubscribePage: z.string().url().optional().describe("URL of a custom unsubscribe page."),
      UnsubscribeSetting: z
        .enum(["AllClientLists", "OnlyThisList"])
        .optional()
        .describe("Whether unsubscribes apply to all client lists or only this one."),
      ConfirmedOptIn: z.boolean().optional().describe("Whether the list uses confirmed (double) opt-in."),
      ConfirmationSuccessPage: z
        .string()
        .url()
        .optional()
        .describe("URL shown after confirmed opt-in succeeds."),
    },
    handler: (a, c) =>
      c.post(`/lists/${a.clientId}`, {
        Title: a.Title,
        UnsubscribePage: a.UnsubscribePage,
        UnsubscribeSetting: a.UnsubscribeSetting,
        ConfirmedOptIn: a.ConfirmedOptIn,
        ConfirmationSuccessPage: a.ConfirmationSuccessPage,
      }),
  },
  {
    name: "cm_get_list",
    description: "Get a list's details and configuration.",
    category: "lists",
    inputSchema: { listId },
    annotations: RO,
    handler: (a, c) => c.get(`/lists/${a.listId}`),
  },
  {
    name: "cm_update_list",
    description: "Update a list's settings.",
    category: "lists",
    inputSchema: {
      listId,
      Title: z.string().describe("List title."),
      UnsubscribePage: z.string().url().optional().describe("URL of a custom unsubscribe page."),
      UnsubscribeSetting: z
        .enum(["AllClientLists", "OnlyThisList"])
        .optional()
        .describe("Unsubscribe scope setting."),
      ConfirmedOptIn: z.boolean().optional().describe("Whether the list uses confirmed opt-in."),
      ConfirmationSuccessPage: z.string().url().optional().describe("Confirmed opt-in success page URL."),
    },
    annotations: { idempotentHint: true },
    handler: (a, c) =>
      c.put(`/lists/${a.listId}`, {
        Title: a.Title,
        UnsubscribePage: a.UnsubscribePage,
        UnsubscribeSetting: a.UnsubscribeSetting,
        ConfirmedOptIn: a.ConfirmedOptIn,
        ConfirmationSuccessPage: a.ConfirmationSuccessPage,
      }),
  },
  {
    name: "cm_delete_list",
    description: "⚠️ Permanently delete a list and all its subscribers.",
    category: "lists",
    inputSchema: { listId },
    annotations: { destructiveHint: true },
    handler: (a, c) => c.delete(`/lists/${a.listId}`),
  },
  {
    name: "cm_get_list_stats",
    description: "Get subscriber statistics for a list.",
    category: "lists",
    inputSchema: { listId },
    annotations: RO,
    handler: (a, c) => c.get(`/lists/${a.listId}/stats`),
  },
  {
    name: "cm_get_custom_fields",
    description: "Get all custom fields defined on a list.",
    category: "lists",
    inputSchema: { listId },
    annotations: RO,
    handler: (a, c) => c.get(`/lists/${a.listId}/customfields`),
  },
  {
    name: "cm_create_custom_field",
    description: "Create a new custom field on a list.",
    category: "lists",
    inputSchema: {
      listId,
      FieldName: z.string().describe("Display name of the custom field."),
      DataType: z
        .enum(["Text", "Number", "MultiSelectOne", "MultiSelectMany", "Date"])
        .describe("Custom field data type."),
      Options: z
        .array(z.string())
        .optional()
        .describe("Selectable options (required for MultiSelectOne/MultiSelectMany)."),
      VisibleInPreferenceCenter: z
        .boolean()
        .optional()
        .describe("Whether the field is visible in the subscriber preference center."),
    },
    handler: (a, c) =>
      c.post(`/lists/${a.listId}/customfields`, {
        FieldName: a.FieldName,
        DataType: a.DataType,
        Options: a.Options,
        VisibleInPreferenceCenter: a.VisibleInPreferenceCenter,
      }),
  },
  {
    name: "cm_update_custom_field",
    description: "Update a custom field's name and preference-center visibility.",
    category: "lists",
    inputSchema: {
      listId,
      customFieldKey: z.string().describe("Custom field key, e.g. '[MyField]'."),
      FieldName: z.string().describe("New display name."),
      VisibleInPreferenceCenter: z.boolean().describe("Whether visible in the preference center."),
    },
    annotations: { idempotentHint: true },
    handler: (a, c) =>
      c.put(`/lists/${a.listId}/customfields/${enc(a.customFieldKey)}`, {
        FieldName: a.FieldName,
        VisibleInPreferenceCenter: a.VisibleInPreferenceCenter,
      }),
  },
  {
    name: "cm_update_custom_field_options",
    description: "Update the selectable options of a multi-valued custom field.",
    category: "lists",
    inputSchema: {
      listId,
      customFieldKey: z.string().describe("Custom field key, e.g. '[MyField]'."),
      Options: z.array(z.string()).describe("The new set of options."),
      KeepExistingOptions: z
        .boolean()
        .optional()
        .describe("If true, add to existing options instead of replacing them."),
    },
    annotations: { idempotentHint: true },
    handler: (a, c) =>
      c.put(`/lists/${a.listId}/customfields/${enc(a.customFieldKey)}/options`, {
        Options: a.Options,
        KeepExistingOptions: a.KeepExistingOptions ?? false,
      }),
  },
  {
    name: "cm_delete_custom_field",
    description: "⚠️ Delete a custom field from a list.",
    category: "lists",
    inputSchema: {
      listId,
      customFieldKey: z.string().describe("Custom field key, e.g. '[MyField]'."),
    },
    annotations: { destructiveHint: true },
    handler: (a, c) => c.delete(`/lists/${a.listId}/customfields/${enc(a.customFieldKey)}`),
  },
  {
    name: "cm_get_active_subscribers",
    description: "Get a list's active subscribers (paged, optionally since a date).",
    category: "lists",
    inputSchema: { listId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: subscriberReport("active"),
  },
  {
    name: "cm_get_unconfirmed_subscribers",
    description: "Get a list's unconfirmed subscribers (paged).",
    category: "lists",
    inputSchema: { listId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: subscriberReport("unconfirmed"),
  },
  {
    name: "cm_get_unsubscribed_subscribers",
    description: "Get a list's unsubscribed subscribers (paged).",
    category: "lists",
    inputSchema: { listId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: subscriberReport("unsubscribed"),
  },
  {
    name: "cm_get_bounced_subscribers",
    description: "Get a list's bounced subscribers (paged).",
    category: "lists",
    inputSchema: { listId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: subscriberReport("bounced"),
  },
  {
    name: "cm_get_deleted_subscribers",
    description: "Get a list's deleted subscribers (paged).",
    category: "lists",
    inputSchema: { listId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: subscriberReport("deleted"),
  },
  {
    name: "cm_get_list_segments",
    description: "Get all segments defined on a list.",
    category: "lists",
    inputSchema: { listId },
    annotations: RO,
    handler: (a, c) => c.get(`/lists/${a.listId}/segments`),
  },
  {
    name: "cm_get_list_webhooks",
    description: "Get all webhooks configured on a list.",
    category: "lists",
    inputSchema: { listId },
    annotations: RO,
    handler: (a, c) => c.get(`/lists/${a.listId}/webhooks`),
  },
  {
    name: "cm_create_webhook",
    description: "Create a webhook on a list for subscribe/deactivate/update events.",
    category: "lists",
    inputSchema: {
      listId,
      Events: z
        .array(z.enum(["Subscribe", "Deactivate", "Update"]))
        .describe("Events to subscribe the webhook to."),
      Url: z.string().url().describe("Endpoint URL that will receive webhook POSTs."),
      PayloadFormat: z.enum(["json", "xml"]).describe("Webhook payload format."),
    },
    handler: (a, c) =>
      c.post(`/lists/${a.listId}/webhooks`, {
        Events: a.Events,
        Url: a.Url,
        PayloadFormat: a.PayloadFormat,
      }),
  },
  {
    name: "cm_delete_webhook",
    description: "⚠️ Delete a webhook from a list.",
    category: "lists",
    inputSchema: { listId, webhookId: z.string().describe("Webhook ID.") },
    annotations: { destructiveHint: true },
    handler: (a, c) => c.delete(`/lists/${a.listId}/webhooks/${enc(a.webhookId)}`),
  },
  {
    name: "cm_test_webhook",
    description: "Send a test event to a webhook to verify its endpoint.",
    category: "lists",
    inputSchema: { listId, webhookId: z.string().describe("Webhook ID.") },
    annotations: RO,
    handler: (a, c) => c.get(`/lists/${a.listId}/webhooks/${enc(a.webhookId)}/test`),
  },
  {
    name: "cm_activate_webhook",
    description: "Activate (enable) a webhook on a list.",
    category: "lists",
    inputSchema: { listId, webhookId: z.string().describe("Webhook ID.") },
    annotations: { idempotentHint: true },
    handler: (a, c) => c.put(`/lists/${a.listId}/webhooks/${enc(a.webhookId)}/activate`),
  },
  {
    name: "cm_deactivate_webhook",
    description: "Deactivate (disable) a webhook on a list.",
    category: "lists",
    inputSchema: { listId, webhookId: z.string().describe("Webhook ID.") },
    annotations: { idempotentHint: true },
    handler: (a, c) => c.put(`/lists/${a.listId}/webhooks/${enc(a.webhookId)}/deactivate`),
  },
];
