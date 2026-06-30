import { z } from "zod";
import type { ToolDef } from "../types.js";
import { pagingShape, dateShape, pagingQuery } from "./common.js";

const RO = { readOnlyHint: true } as const;
const emailId = z.string().describe("Journey email ID.");

const emailReport = (segment: string): ToolDef["handler"] => (a, c) =>
  c.get(`/journeys/email/${a.emailId}/${segment}`, pagingQuery(a));

export const journeyTools: ToolDef[] = [
  {
    name: "cm_get_client_journeys",
    description: "List all journeys for a client (ID, name, status, list ID).",
    category: "journeys",
    inputSchema: { clientId: z.string().describe("Client ID.") },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/journeys`),
  },
  {
    name: "cm_get_journey",
    description: "Get a journey's full details including per-email statistics.",
    category: "journeys",
    inputSchema: { journeyId: z.string().describe("Journey ID.") },
    annotations: RO,
    handler: (a, c) => c.get(`/journeys/${a.journeyId}`),
  },
  {
    name: "cm_get_journey_email_recipients",
    description: "Get the recipients of a specific journey email (paged).",
    category: "journeys",
    inputSchema: { emailId, ...pagingShape },
    annotations: RO,
    handler: emailReport("recipients"),
  },
  {
    name: "cm_get_journey_email_opens",
    description: "Get opens for a specific journey email (paged).",
    category: "journeys",
    inputSchema: { emailId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: emailReport("opens"),
  },
  {
    name: "cm_get_journey_email_clicks",
    description: "Get clicks for a specific journey email (paged).",
    category: "journeys",
    inputSchema: { emailId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: emailReport("clicks"),
  },
  {
    name: "cm_get_journey_email_bounces",
    description: "Get bounces for a specific journey email (paged).",
    category: "journeys",
    inputSchema: { emailId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: emailReport("bounces"),
  },
  {
    name: "cm_get_journey_email_unsubscribes",
    description: "Get unsubscribes for a specific journey email (paged).",
    category: "journeys",
    inputSchema: { emailId, ...pagingShape, ...dateShape },
    annotations: RO,
    handler: emailReport("unsubscribes"),
  },
  {
    name: "cm_copy_journey",
    description: "Copy a journey to a destination client and list.",
    category: "journeys",
    inputSchema: {
      journeyId: z.string().describe("Journey ID to copy."),
      Name: z.string().describe("Name for the copied journey."),
      ClientID: z.string().describe("Destination client ID."),
      ListID: z.string().describe("Destination list ID."),
    },
    handler: (a, c) =>
      c.post(`/journeys/${a.journeyId}/copy`, {
        Name: a.Name,
        ClientID: a.ClientID,
        ListID: a.ListID,
      }),
  },
  {
    name: "cm_publish_event",
    description: "Publish a Subscriber Activity event to trigger a journey for a client.",
    category: "journeys",
    inputSchema: {
      clientId: z.string().describe("Client ID to publish the event for."),
      EventName: z.string().describe("Name of the event being published."),
      Email: z.string().email().describe("Subscriber email address the event relates to."),
      Data: z.record(z.any()).optional().describe("Arbitrary event payload data."),
    },
    annotations: { idempotentHint: false },
    handler: (a, c) =>
      c.post(`/events/publish/${a.clientId}`, {
        EventName: a.EventName,
        Email: a.Email,
        Data: a.Data,
      }),
  },
];
