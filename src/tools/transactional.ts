import { z } from "zod";
import type { ToolDef } from "../types.js";

const RO = { readOnlyHint: true } as const;
const NO_JSON = false; // transactional endpoints are JSON by default; no `.json` suffix

const attachment = z.object({
  Type: z.string().describe("MIME type, e.g. 'application/pdf'."),
  Name: z.string().describe("File name."),
  Content: z.string().describe("Base64-encoded file content."),
});

const consentToTrack = z
  .enum(["Yes", "No", "Unchanged"])
  .describe("Whether recipients consent to tracking. Required.");

export const transactionalTools: ToolDef[] = [
  {
    name: "cm_list_smart_emails",
    description: "List smart transactional emails, optionally filtered by status and client.",
    category: "transactional",
    inputSchema: {
      status: z
        .enum(["all", "active", "draft"])
        .optional()
        .describe("Filter by smart email status."),
      clientID: z.string().optional().describe("Restrict to a specific client (OAuth/account auth)."),
    },
    annotations: RO,
    handler: (a, c) =>
      c.get("/transactional/smartEmail", { status: a.status, clientID: a.clientID }, NO_JSON),
  },
  {
    name: "cm_get_smart_email",
    description: "Get details of a specific smart transactional email.",
    category: "transactional",
    inputSchema: { smartEmailID: z.string().describe("Smart email ID.") },
    annotations: RO,
    handler: (a, c) => c.get(`/transactional/smartEmail/${a.smartEmailID}`, undefined, NO_JSON),
  },
  {
    name: "cm_send_smart_email",
    description: "⚠️ Send a smart transactional email to one or more recipients.",
    category: "transactional",
    inputSchema: {
      smartEmailID: z.string().describe("Smart email ID to send."),
      To: z.array(z.string()).describe("Recipient addresses (may include display name)."),
      CC: z.array(z.string()).optional().describe("CC addresses."),
      BCC: z.array(z.string()).optional().describe("BCC addresses."),
      Data: z
        .record(z.any())
        .optional()
        .describe("Key/value data for the smart email's merge fields."),
      Attachments: z.array(attachment).optional().describe("File attachments."),
      AddRecipientsToList: z
        .boolean()
        .optional()
        .describe("Add recipients to the smart email's linked list."),
      ConsentToTrack: consentToTrack,
    },
    annotations: { destructiveHint: true },
    handler: (a, c) =>
      c.post(
        `/transactional/smartEmail/${a.smartEmailID}/send`,
        {
          To: a.To,
          CC: a.CC,
          BCC: a.BCC,
          Data: a.Data,
          Attachments: a.Attachments,
          AddRecipientsToList: a.AddRecipientsToList,
          ConsentToTrack: a.ConsentToTrack,
        },
        undefined,
        NO_JSON,
      ),
  },
  {
    name: "cm_send_classic_email",
    description: "⚠️ Send a classic transactional email with your own content.",
    category: "transactional",
    inputSchema: {
      Subject: z.string().describe("Email subject."),
      From: z.string().describe("Sender address (may include display name)."),
      ReplyTo: z.string().optional().describe("Reply-to address."),
      To: z.array(z.string()).describe("Recipient addresses."),
      CC: z.array(z.string()).optional(),
      BCC: z.array(z.string()).optional(),
      Html: z.string().optional().describe("HTML body."),
      Text: z.string().optional().describe("Plain-text body."),
      Attachments: z.array(attachment).optional().describe("File attachments."),
      TrackOpens: z.boolean().optional().describe("Track opens."),
      TrackClicks: z.boolean().optional().describe("Track clicks."),
      InlineCSS: z.boolean().optional().describe("Inline CSS before sending."),
      Group: z.string().optional().describe("Classic email group to record this send under."),
      AddRecipientsToListID: z
        .string()
        .optional()
        .describe("List ID to add recipients to."),
      ClientID: z
        .string()
        .optional()
        .describe("Client ID to send on behalf of (OAuth/account auth)."),
      ConsentToTrack: consentToTrack,
    },
    annotations: { destructiveHint: true },
    handler: (a, c) =>
      c.post(
        "/transactional/classicEmail/send",
        {
          Subject: a.Subject,
          From: a.From,
          ReplyTo: a.ReplyTo,
          To: a.To,
          CC: a.CC,
          BCC: a.BCC,
          Html: a.Html,
          Text: a.Text,
          Attachments: a.Attachments,
          TrackOpens: a.TrackOpens,
          TrackClicks: a.TrackClicks,
          InlineCSS: a.InlineCSS,
          Group: a.Group,
          AddRecipientsToListID: a.AddRecipientsToListID,
          ConsentToTrack: a.ConsentToTrack,
        },
        { clientID: a.ClientID },
        NO_JSON,
      ),
  },
  {
    name: "cm_list_classic_email_groups",
    description: "List classic transactional email groups.",
    category: "transactional",
    inputSchema: {
      clientID: z.string().optional().describe("Restrict to a specific client (OAuth/account auth)."),
    },
    annotations: RO,
    handler: (a, c) =>
      c.get("/transactional/classicEmail/groups", { clientID: a.clientID }, NO_JSON),
  },
  {
    name: "cm_get_transactional_statistics",
    description: "Get transactional delivery and engagement statistics over a period.",
    category: "transactional",
    inputSchema: {
      from: z.string().optional().describe("Start date (YYYY-MM-DD)."),
      to: z.string().optional().describe("End date (YYYY-MM-DD)."),
      timezone: z.string().optional().describe("Timezone for the date range, e.g. 'utc' or 'client'."),
      group: z.string().optional().describe("Filter by classic email group."),
      smartEmailID: z.string().optional().describe("Filter by smart email ID."),
      clientID: z.string().optional().describe("Restrict to a specific client (OAuth/account auth)."),
    },
    annotations: RO,
    handler: (a, c) =>
      c.get(
        "/transactional/statistics",
        {
          from: a.from,
          to: a.to,
          timezone: a.timezone,
          group: a.group,
          smartEmailID: a.smartEmailID,
          clientID: a.clientID,
        },
        NO_JSON,
      ),
  },
  {
    name: "cm_list_transactional_messages",
    description: "List sent transactional messages with filtering and pagination.",
    category: "transactional",
    inputSchema: {
      status: z.enum(["all", "delivered", "bounced", "opened", "clicked"]).optional(),
      count: z.number().int().positive().max(500).optional().describe("Number of messages to return."),
      sentBeforeID: z.string().optional().describe("Return messages sent before this message ID."),
      sentAfterID: z.string().optional().describe("Return messages sent after this message ID."),
      smartEmailID: z.string().optional().describe("Filter by smart email ID."),
      group: z.string().optional().describe("Filter by classic email group."),
      clientID: z.string().optional().describe("Restrict to a specific client (OAuth/account auth)."),
    },
    annotations: RO,
    handler: (a, c) =>
      c.get(
        "/transactional/messages",
        {
          status: a.status,
          count: a.count,
          sentBeforeID: a.sentBeforeID,
          sentAfterID: a.sentAfterID,
          smartEmailID: a.smartEmailID,
          group: a.group,
          clientID: a.clientID,
        },
        NO_JSON,
      ),
  },
  {
    name: "cm_get_transactional_message",
    description: "Get the details and status of a single transactional message.",
    category: "transactional",
    inputSchema: {
      messageID: z.string().describe("Transactional message ID."),
      statistics: z.boolean().optional().describe("Include open/click statistics."),
    },
    annotations: RO,
    handler: (a, c) =>
      c.get(`/transactional/messages/${a.messageID}`, { statistics: a.statistics }, NO_JSON),
  },
  {
    name: "cm_resend_transactional_message",
    description: "⚠️ Resend a previously sent transactional message (returns a new message ID).",
    category: "transactional",
    inputSchema: { messageID: z.string().describe("Transactional message ID to resend.") },
    annotations: { destructiveHint: true },
    handler: (a, c) =>
      c.post(`/transactional/messages/${a.messageID}/resend`, undefined, undefined, NO_JSON),
  },
];
