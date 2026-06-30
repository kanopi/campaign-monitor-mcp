import { z } from "zod";
import type { ToolDef } from "../types.js";
import { pagingShape, dateShape, pagingQuery } from "./common.js";

const RO = { readOnlyHint: true } as const;
const clientId = z.string().describe("Client ID that owns the campaign.");
const campaignId = z.string().describe("Campaign ID.");

const report = (segment: string): ToolDef["handler"] => (a, c) =>
  c.get(`/campaigns/${a.campaignId}/${segment}`, pagingQuery(a));

export const campaignTools: ToolDef[] = [
  {
    name: "cm_create_campaign",
    description: "Create a draft campaign from HTML/text content for a client.",
    category: "campaigns",
    inputSchema: {
      clientId,
      Name: z.string().describe("Internal campaign name."),
      Subject: z.string().describe("Email subject line."),
      FromName: z.string().describe("Sender display name."),
      FromEmail: z.string().email().describe("Sender (from) email address — must be a confirmed sender."),
      ReplyTo: z.string().email().describe("Reply-to email address."),
      HtmlUrl: z.string().url().describe("Publicly accessible URL of the campaign HTML content."),
      TextUrl: z.string().url().optional().describe("Optional URL of plain-text content."),
      ListIDs: z.array(z.string()).optional().describe("List IDs to send to."),
      SegmentIDs: z.array(z.string()).optional().describe("Segment IDs to send to."),
    },
    handler: (a, c) =>
      c.post(`/campaigns/${a.clientId}`, {
        Name: a.Name,
        Subject: a.Subject,
        FromName: a.FromName,
        FromEmail: a.FromEmail,
        ReplyTo: a.ReplyTo,
        HtmlUrl: a.HtmlUrl,
        TextUrl: a.TextUrl,
        ListIDs: a.ListIDs ?? [],
        SegmentIDs: a.SegmentIDs ?? [],
      }),
  },
  {
    name: "cm_create_campaign_from_template",
    description: "Create a draft campaign from a saved template for a client.",
    category: "campaigns",
    inputSchema: {
      clientId,
      Name: z.string().describe("Internal campaign name."),
      Subject: z.string().describe("Email subject line."),
      FromName: z.string().describe("Sender display name."),
      FromEmail: z.string().email().describe("Sender (from) email address."),
      ReplyTo: z.string().email().describe("Reply-to email address."),
      TemplateID: z.string().describe("Template ID to base the campaign on."),
      ListIDs: z.array(z.string()).optional().describe("List IDs to send to."),
      SegmentIDs: z.array(z.string()).optional().describe("Segment IDs to send to."),
      TemplateContent: z
        .record(z.any())
        .describe(
          "Template content object with Singlelines/Multilines/Images/Repeaters matching the template's editable regions.",
        ),
    },
    handler: (a, c) =>
      c.post(`/campaigns/${a.clientId}/fromtemplate`, {
        Name: a.Name,
        Subject: a.Subject,
        FromName: a.FromName,
        FromEmail: a.FromEmail,
        ReplyTo: a.ReplyTo,
        TemplateID: a.TemplateID,
        ListIDs: a.ListIDs ?? [],
        SegmentIDs: a.SegmentIDs ?? [],
        TemplateContent: a.TemplateContent,
      }),
  },
  {
    name: "cm_send_campaign",
    description:
      "⚠️ Send a draft campaign immediately or schedule it. SendDate 'Immediately' sends now; otherwise provide a date in the client's timezone (YYYY-MM-DD HH:MM).",
    category: "campaigns",
    inputSchema: {
      campaignId,
      ConfirmationEmail: z
        .string()
        .describe("Email address(es) to send a delivery confirmation to (comma-separated)."),
      SendDate: z
        .string()
        .describe("'Immediately' or a future date/time in the client's timezone."),
    },
    annotations: { destructiveHint: true },
    handler: (a, c) =>
      c.post(`/campaigns/${a.campaignId}/send`, {
        ConfirmationEmail: a.ConfirmationEmail,
        SendDate: a.SendDate,
      }),
  },
  {
    name: "cm_send_campaign_preview",
    description: "Send a preview/test of a draft campaign to specific recipients.",
    category: "campaigns",
    inputSchema: {
      campaignId,
      PreviewRecipients: z.array(z.string().email()).describe("Email addresses to send the preview to."),
      Personalize: z
        .enum(["Random", "Fallback"])
        .optional()
        .describe("How to personalize preview content: 'Random' or 'Fallback'."),
    },
    handler: (a, c) =>
      c.post(`/campaigns/${a.campaignId}/sendpreview`, {
        PreviewRecipients: a.PreviewRecipients,
        Personalize: a.Personalize ?? "Fallback",
      }),
  },
  {
    name: "cm_unschedule_campaign",
    description: "Cancel a scheduled campaign and return it to draft status.",
    category: "campaigns",
    inputSchema: { campaignId },
    handler: (a, c) => c.post(`/campaigns/${a.campaignId}/unschedule`),
  },
  {
    name: "cm_delete_campaign",
    description: "⚠️ Permanently delete a campaign (draft, scheduled, or sent) from the account.",
    category: "campaigns",
    inputSchema: { campaignId },
    annotations: { destructiveHint: true },
    handler: (a, c) => c.delete(`/campaigns/${a.campaignId}`),
  },
  {
    name: "cm_get_campaign_summary",
    description: "Get a campaign's overall performance summary (opens, clicks, bounces, etc.).",
    category: "campaigns",
    inputSchema: { campaignId },
    annotations: RO,
    handler: (a, c) => c.get(`/campaigns/${a.campaignId}/summary`),
  },
  {
    name: "cm_get_campaign_email_client_usage",
    description: "Get the email clients used to open a campaign.",
    category: "campaigns",
    inputSchema: { campaignId },
    annotations: RO,
    handler: (a, c) => c.get(`/campaigns/${a.campaignId}/emailclientusage`),
  },
  {
    name: "cm_get_campaign_lists_and_segments",
    description: "Get the lists and segments a campaign was sent to.",
    category: "campaigns",
    inputSchema: { campaignId },
    annotations: RO,
    handler: (a, c) => c.get(`/campaigns/${a.campaignId}/listsandsegments`),
  },
  {
    name: "cm_get_campaign_recipients",
    description: "Get the paged list of recipients a campaign was sent to.",
    category: "campaigns",
    inputSchema: { campaignId, ...pagingShape },
    annotations: RO,
    handler: report("recipients"),
  },
  {
    name: "cm_get_campaign_opens",
    description: "Get paged campaign opens with timestamps and geolocation.",
    category: "campaigns",
    inputSchema: { campaignId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: report("opens"),
  },
  {
    name: "cm_get_campaign_clicks",
    description: "Get paged campaign link clicks with URLs, timestamps and geolocation.",
    category: "campaigns",
    inputSchema: { campaignId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: report("clicks"),
  },
  {
    name: "cm_get_campaign_bounces",
    description: "Get paged campaign bounces with bounce type and reason.",
    category: "campaigns",
    inputSchema: { campaignId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: report("bounces"),
  },
  {
    name: "cm_get_campaign_unsubscribes",
    description: "Get paged campaign unsubscribes with timestamps.",
    category: "campaigns",
    inputSchema: { campaignId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: report("unsubscribes"),
  },
  {
    name: "cm_get_campaign_spam_complaints",
    description: "Get paged spam complaints for a campaign.",
    category: "campaigns",
    inputSchema: { campaignId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: report("spam"),
  },
];
