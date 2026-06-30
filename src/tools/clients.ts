import { z } from "zod";
import type { ToolDef } from "../types.js";
import { pagingShape, pagingQuery } from "./common.js";

const RO = { readOnlyHint: true } as const;
const clientId = z.string().describe("Client ID (a hex string identifying the client).");

export const clientTools: ToolDef[] = [
  {
    name: "cm_create_client",
    description: "Create a new client in the account.",
    category: "clients",
    inputSchema: {
      CompanyName: z.string().describe("Client company name."),
      Country: z.string().describe("Country (must match a value from cm_list_countries)."),
      TimeZone: z.string().describe("Timezone (must match a value from cm_list_timezones)."),
    },
    handler: (a, c) =>
      c.post("/clients", { CompanyName: a.CompanyName, Country: a.Country, TimeZone: a.TimeZone }),
  },
  {
    name: "cm_get_client",
    description: "Get full details for a client, including API key and billing settings.",
    category: "clients",
    inputSchema: { clientId },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}`),
  },
  {
    name: "cm_delete_client",
    description: "⚠️ Permanently delete a client from the account.",
    category: "clients",
    inputSchema: { clientId },
    annotations: { destructiveHint: true },
    handler: (a, c) => c.delete(`/clients/${a.clientId}`),
  },
  {
    name: "cm_get_client_lists",
    description: "Get all subscriber lists belonging to a client.",
    category: "clients",
    inputSchema: { clientId },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/lists`),
  },
  {
    name: "cm_get_lists_for_email",
    description: "Find all of a client's lists that a specific email address is subscribed to.",
    category: "clients",
    inputSchema: { clientId, email: z.string().email().describe("Email address to look up.") },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/listsforemail`, { email: a.email }),
  },
  {
    name: "cm_get_client_segments",
    description: "Get all segments across all of a client's lists.",
    category: "clients",
    inputSchema: { clientId },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/segments`),
  },
  {
    name: "cm_get_client_suppression_list",
    description: "Get the client's suppression list (paged).",
    category: "clients",
    inputSchema: { clientId, ...pagingShape },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/suppressionlist`, pagingQuery(a)),
  },
  {
    name: "cm_suppress_emails",
    description: "Add one or more email addresses to a client's suppression list.",
    category: "clients",
    inputSchema: {
      clientId,
      EmailAddresses: z.array(z.string().email()).describe("Email addresses to suppress."),
    },
    handler: (a, c) => c.post(`/clients/${a.clientId}/suppress`, { EmailAddresses: a.EmailAddresses }),
  },
  {
    name: "cm_unsuppress_email",
    description: "Remove an email address from a client's suppression list.",
    category: "clients",
    inputSchema: { clientId, email: z.string().email().describe("Email address to unsuppress.") },
    handler: (a, c) => c.put(`/clients/${a.clientId}/unsuppress`, undefined, { email: a.email }),
  },
  {
    name: "cm_get_client_templates",
    description: "Get all templates belonging to a client.",
    category: "clients",
    inputSchema: { clientId },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/templates`),
  },
  {
    name: "cm_set_client_basics",
    description: "Update a client's basic details (company name, country, timezone).",
    category: "clients",
    inputSchema: {
      clientId,
      CompanyName: z.string().describe("Client company name."),
      Country: z.string().describe("Country name."),
      TimeZone: z.string().describe("Timezone name."),
    },
    annotations: { idempotentHint: true },
    handler: (a, c) =>
      c.put(`/clients/${a.clientId}/setbasics`, {
        CompanyName: a.CompanyName,
        Country: a.Country,
        TimeZone: a.TimeZone,
      }),
  },
  {
    name: "cm_set_client_payg_billing",
    description: "Configure pay-as-you-go (PAYG) billing settings for a client.",
    category: "clients",
    inputSchema: {
      clientId,
      Currency: z.string().describe("Billing currency code, e.g. 'USD'."),
      CanPurchaseCredits: z.boolean().describe("Whether the client may purchase email credits."),
      ClientPays: z.boolean().describe("Whether the client pays for their sending."),
      MarkupPercentage: z.number().describe("Markup percentage applied to spend."),
      MarkupOnDelivery: z.number().optional().describe("Flat markup added per campaign delivery."),
      MarkupPerRecipient: z.number().optional().describe("Markup added per recipient."),
      MarkupOnDesignSpamTest: z
        .number()
        .optional()
        .describe("Markup added per design & spam test."),
    },
    annotations: { idempotentHint: true },
    handler: (a, c) =>
      c.put(`/clients/${a.clientId}/setpaygbilling`, {
        Currency: a.Currency,
        CanPurchaseCredits: a.CanPurchaseCredits,
        ClientPays: a.ClientPays,
        MarkupPercentage: a.MarkupPercentage,
        MarkupOnDelivery: a.MarkupOnDelivery,
        MarkupPerRecipient: a.MarkupPerRecipient,
        MarkupOnDesignSpamTest: a.MarkupOnDesignSpamTest,
      }),
  },
  {
    name: "cm_set_client_monthly_billing",
    description: "Configure monthly billing settings for a client.",
    category: "clients",
    inputSchema: {
      clientId,
      Currency: z.string().describe("Billing currency code, e.g. 'USD'."),
      ClientPays: z.boolean().describe("Whether the client pays for their sending."),
      MarkupPercentage: z.number().describe("Markup percentage applied to the monthly fee."),
      MonthlyScheme: z
        .enum(["Basic", "Unlimited"])
        .optional()
        .describe("Monthly pricing scheme."),
    },
    annotations: { idempotentHint: true },
    handler: (a, c) =>
      c.put(`/clients/${a.clientId}/setmonthlybilling`, {
        Currency: a.Currency,
        ClientPays: a.ClientPays,
        MarkupPercentage: a.MarkupPercentage,
        MonthlyScheme: a.MonthlyScheme,
      }),
  },
  {
    name: "cm_transfer_credits",
    description: "Transfer email credits to or from a client (negative to take credits back).",
    category: "clients",
    inputSchema: {
      clientId,
      Credits: z.number().int().describe("Number of credits to transfer (negative to deduct)."),
      CanUseMyCreditsWhenTheyRunOut: z
        .boolean()
        .describe("Allow the client to draw on your account credits when theirs run out."),
    },
    handler: (a, c) =>
      c.post(`/clients/${a.clientId}/credits`, {
        Credits: a.Credits,
        CanUseMyCreditsWhenTheyRunOut: a.CanUseMyCreditsWhenTheyRunOut,
      }),
  },
  {
    name: "cm_list_people",
    description: "List all (active or invited) people for a client.",
    category: "clients",
    inputSchema: { clientId },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/people`),
  },
  {
    name: "cm_get_person",
    description: "Get details for a specific person on a client by email.",
    category: "clients",
    inputSchema: { clientId, email: z.string().email().describe("Person's email address.") },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/people`, { email: a.email }),
  },
  {
    name: "cm_add_person",
    description: "Add a new person to a client account.",
    category: "clients",
    inputSchema: {
      clientId,
      EmailAddress: z.string().email().describe("Person's email address."),
      Name: z.string().describe("Person's full name."),
      AccessLevel: z
        .number()
        .int()
        .optional()
        .describe("Bitmask of access permissions (see Campaign Monitor docs)."),
      Password: z.string().optional().describe("Initial password for the person."),
    },
    handler: (a, c) =>
      c.post(`/clients/${a.clientId}/people`, {
        EmailAddress: a.EmailAddress,
        Name: a.Name,
        AccessLevel: a.AccessLevel,
        Password: a.Password,
      }),
  },
  {
    name: "cm_update_person",
    description: "Update an existing person on a client account.",
    category: "clients",
    inputSchema: {
      clientId,
      email: z.string().email().describe("Current email address of the person to update."),
      EmailAddress: z.string().email().describe("New email address."),
      Name: z.string().describe("New full name."),
      AccessLevel: z.number().int().optional().describe("Bitmask of access permissions."),
      Password: z.string().optional().describe("New password."),
    },
    annotations: { idempotentHint: true },
    handler: (a, c) =>
      c.put(
        `/clients/${a.clientId}/people`,
        {
          EmailAddress: a.EmailAddress,
          Name: a.Name,
          AccessLevel: a.AccessLevel,
          Password: a.Password,
        },
        { email: a.email },
      ),
  },
  {
    name: "cm_delete_person",
    description: "⚠️ Delete a person from a client account.",
    category: "clients",
    inputSchema: { clientId, email: z.string().email().describe("Email of the person to delete.") },
    annotations: { destructiveHint: true },
    handler: (a, c) => c.delete(`/clients/${a.clientId}/people`, { email: a.email }),
  },
  {
    name: "cm_get_client_primary_contact",
    description: "Get a client's primary contact email address.",
    category: "clients",
    inputSchema: { clientId },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/primarycontact`),
  },
  {
    name: "cm_set_client_primary_contact",
    description: "Set a client's primary contact to an existing person.",
    category: "clients",
    inputSchema: { clientId, email: z.string().email().describe("Email of the person to make primary contact.") },
    annotations: { idempotentHint: true },
    handler: (a, c) => c.put(`/clients/${a.clientId}/primarycontact`, undefined, { email: a.email }),
  },
  {
    name: "cm_get_client_tags",
    description: "Get all campaign tags for a client with their campaign counts.",
    category: "clients",
    inputSchema: { clientId },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/tags`),
  },
  {
    name: "cm_get_client_sent_campaigns",
    description: "Get a client's sent campaigns.",
    category: "clients",
    inputSchema: { clientId },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/campaigns`),
  },
  {
    name: "cm_get_client_scheduled_campaigns",
    description: "Get a client's currently scheduled campaigns.",
    category: "clients",
    inputSchema: { clientId },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/scheduled`),
  },
  {
    name: "cm_get_client_drafts",
    description: "Get a client's draft campaigns.",
    category: "clients",
    inputSchema: { clientId },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/drafts`),
  },
  {
    name: "cm_get_sending_domains",
    description: "Get all sending domains for a client and their verification status.",
    category: "clients",
    inputSchema: { clientId },
    annotations: RO,
    handler: (a, c) => c.get(`/clients/${a.clientId}/sendingdomains`),
  },
  {
    name: "cm_add_sending_domain",
    description: "Add a new sending domain to a client.",
    category: "clients",
    inputSchema: { clientId, Domain: z.string().describe("Domain to add, e.g. 'mail.example.com'.") },
    handler: (a, c) => c.post(`/clients/${a.clientId}/sendingdomains`, { Domain: a.Domain }),
  },
  {
    name: "cm_delete_sending_domain",
    description: "⚠️ Remove a sending domain from a client.",
    category: "clients",
    inputSchema: { clientId, Domain: z.string().describe("Domain to remove.") },
    annotations: { destructiveHint: true },
    handler: (a, c) =>
      c.request("DELETE", `/clients/${a.clientId}/sendingdomains`, {
        body: { Domain: a.Domain },
        appendJson: true,
      }),
  },
  {
    name: "cm_copy_sending_domain",
    description: "Copy a verified sending domain from another client to this client.",
    category: "clients",
    inputSchema: {
      clientId,
      Domain: z.string().describe("Domain to copy."),
      FromClientID: z.string().describe("Client ID to copy the verified domain from."),
    },
    handler: (a, c) =>
      c.post(`/clients/${a.clientId}/sendingdomains/copy`, {
        Domain: a.Domain,
        FromClientID: a.FromClientID,
      }),
  },
  {
    name: "cm_authenticate_sending_domain",
    description: "Verify/authenticate the DNS records for a client's sending domain.",
    category: "clients",
    inputSchema: { clientId, Domain: z.string().describe("Domain to authenticate.") },
    handler: (a, c) => c.put(`/clients/${a.clientId}/sendingdomains/authenticate`, { Domain: a.Domain }),
  },
];
