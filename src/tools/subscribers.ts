import { z } from "zod";
import type { ToolDef } from "../types.js";

const RO = { readOnlyHint: true } as const;
const listId = z.string().describe("List ID.");
const consentToTrack = z
  .enum(["Yes", "No", "Unchanged"])
  .describe("Whether the subscriber consents to open/click tracking. Required by Campaign Monitor.");

const customField = z.object({
  Key: z.string().describe("Custom field key (without brackets), e.g. 'website'."),
  Value: z.any().describe("Value to set."),
  Clear: z.boolean().optional().describe("If true, clear this field's value."),
});

export const subscriberTools: ToolDef[] = [
  {
    name: "cm_add_subscriber",
    description: "Add (or resubscribe) a subscriber to a list.",
    category: "subscribers",
    inputSchema: {
      listId,
      EmailAddress: z.string().email().describe("Subscriber email address."),
      Name: z.string().optional().describe("Subscriber name."),
      MobileNumber: z.string().optional().describe("Mobile number in +<country><number> format."),
      CustomFields: z.array(customField).optional().describe("Custom field values."),
      Resubscribe: z.boolean().optional().describe("Resubscribe if previously unsubscribed."),
      RestartSubscriptionBasedAutoresponders: z
        .boolean()
        .optional()
        .describe("Restart subscription-based autoresponders on resubscribe."),
      ConsentToTrack: consentToTrack,
    },
    handler: (a, c) =>
      c.post(`/subscribers/${a.listId}`, {
        EmailAddress: a.EmailAddress,
        Name: a.Name,
        MobileNumber: a.MobileNumber,
        CustomFields: a.CustomFields,
        Resubscribe: a.Resubscribe,
        RestartSubscriptionBasedAutoresponders: a.RestartSubscriptionBasedAutoresponders,
        ConsentToTrack: a.ConsentToTrack,
      }),
  },
  {
    name: "cm_update_subscriber",
    description: "Update an existing subscriber's details (identified by current email).",
    category: "subscribers",
    inputSchema: {
      listId,
      email: z.string().email().describe("Current email address of the subscriber to update."),
      EmailAddress: z.string().email().optional().describe("New email address (omit to keep current)."),
      Name: z.string().optional().describe("Subscriber name."),
      MobileNumber: z.string().optional().describe("Mobile number."),
      CustomFields: z.array(customField).optional().describe("Custom field values."),
      Resubscribe: z.boolean().optional().describe("Resubscribe if previously unsubscribed."),
      RestartSubscriptionBasedAutoresponders: z.boolean().optional(),
      ConsentToTrack: consentToTrack,
    },
    annotations: { idempotentHint: true },
    handler: (a, c) =>
      c.put(
        `/subscribers/${a.listId}`,
        {
          EmailAddress: a.EmailAddress ?? a.email,
          Name: a.Name,
          MobileNumber: a.MobileNumber,
          CustomFields: a.CustomFields,
          Resubscribe: a.Resubscribe,
          RestartSubscriptionBasedAutoresponders: a.RestartSubscriptionBasedAutoresponders,
          ConsentToTrack: a.ConsentToTrack,
        },
        { email: a.email },
      ),
  },
  {
    name: "cm_import_subscribers",
    description: "Bulk-add many subscribers to a list in a single request.",
    category: "subscribers",
    inputSchema: {
      listId,
      Subscribers: z
        .array(
          z.object({
            EmailAddress: z.string().email(),
            Name: z.string().optional(),
            MobileNumber: z.string().optional(),
            CustomFields: z.array(customField).optional(),
            ConsentToTrack: z.enum(["Yes", "No", "Unchanged"]),
          }),
        )
        .describe("Subscribers to import."),
      Resubscribe: z.boolean().optional().describe("Resubscribe previously unsubscribed addresses."),
      QueueSubscriptionBasedAutoResponders: z.boolean().optional(),
      RestartSubscriptionBasedAutoresponders: z.boolean().optional(),
    },
    handler: (a, c) =>
      c.post(`/subscribers/${a.listId}/import`, {
        Subscribers: a.Subscribers,
        Resubscribe: a.Resubscribe,
        QueueSubscriptionBasedAutoResponders: a.QueueSubscriptionBasedAutoResponders,
        RestartSubscriptionBasedAutoresponders: a.RestartSubscriptionBasedAutoresponders,
      }),
  },
  {
    name: "cm_get_subscriber",
    description: "Get a subscriber's details including state and custom fields.",
    category: "subscribers",
    inputSchema: {
      listId,
      email: z.string().email().describe("Subscriber email address."),
      includetrackingpreference: z
        .boolean()
        .optional()
        .describe("Include the subscriber's tracking preference in the response."),
    },
    annotations: RO,
    handler: (a, c) =>
      c.get(`/subscribers/${a.listId}`, {
        email: a.email,
        includetrackingpreference: a.includetrackingpreference,
      }),
  },
  {
    name: "cm_get_subscriber_history",
    description: "Get a subscriber's campaign and workflow email activity history.",
    category: "subscribers",
    inputSchema: { listId, email: z.string().email().describe("Subscriber email address.") },
    annotations: RO,
    handler: (a, c) => c.get(`/subscribers/${a.listId}/history`, { email: a.email }),
  },
  {
    name: "cm_unsubscribe_subscriber",
    description: "Unsubscribe an active subscriber from a list.",
    category: "subscribers",
    inputSchema: { listId, EmailAddress: z.string().email().describe("Email address to unsubscribe.") },
    handler: (a, c) => c.post(`/subscribers/${a.listId}/unsubscribe`, { EmailAddress: a.EmailAddress }),
  },
  {
    name: "cm_delete_subscriber",
    description: "⚠️ Mark a subscriber as deleted from a list.",
    category: "subscribers",
    inputSchema: { listId, email: z.string().email().describe("Email address to delete.") },
    annotations: { destructiveHint: true },
    handler: (a, c) => c.delete(`/subscribers/${a.listId}`, { email: a.email }),
  },
];
