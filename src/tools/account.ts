import { z } from "zod";
import type { ToolDef } from "../types.js";

const RO = { readOnlyHint: true } as const;

export const accountTools: ToolDef[] = [
  {
    name: "cm_list_clients",
    description: "List all clients in your Campaign Monitor account.",
    category: "account",
    inputSchema: {},
    annotations: RO,
    handler: (_a, c) => c.get("/clients"),
  },
  {
    name: "cm_get_billing_details",
    description: "Get the account's billing details and credit balance.",
    category: "account",
    inputSchema: {},
    annotations: RO,
    handler: (_a, c) => c.get("/billingdetails"),
  },
  {
    name: "cm_list_countries",
    description: "Get the list of valid country names accepted by the API.",
    category: "account",
    inputSchema: {},
    annotations: RO,
    handler: (_a, c) => c.get("/countries"),
  },
  {
    name: "cm_list_timezones",
    description: "Get the list of valid timezone names accepted by the API.",
    category: "account",
    inputSchema: {},
    annotations: RO,
    handler: (_a, c) => c.get("/timezones"),
  },
  {
    name: "cm_get_system_date",
    description: "Get the current date and time in the account's timezone.",
    category: "account",
    inputSchema: {},
    annotations: RO,
    handler: (_a, c) => c.get("/systemdate"),
  },
  {
    name: "cm_list_admins",
    description: "List all (active or invited) administrators on the account.",
    category: "account",
    inputSchema: {},
    annotations: RO,
    handler: (_a, c) => c.get("/admins"),
  },
  {
    name: "cm_get_admin",
    description: "Get details for a specific administrator by email address.",
    category: "account",
    inputSchema: { email: z.string().email().describe("Administrator email address.") },
    annotations: RO,
    handler: (a, c) => c.get("/admins", { email: a.email }),
  },
  {
    name: "cm_add_admin",
    description: "Add a new administrator to the account.",
    category: "account",
    inputSchema: {
      EmailAddress: z.string().email().describe("Email address of the new administrator."),
      Name: z.string().describe("Full name of the new administrator."),
    },
    handler: (a, c) => c.post("/admins", { EmailAddress: a.EmailAddress, Name: a.Name }),
  },
  {
    name: "cm_update_admin",
    description: "Update an administrator's email address and/or name.",
    category: "account",
    inputSchema: {
      email: z.string().email().describe("Current email address of the administrator to update."),
      EmailAddress: z.string().email().describe("New email address."),
      Name: z.string().describe("New full name."),
    },
    annotations: { idempotentHint: true },
    handler: (a, c) =>
      c.put("/admins", { EmailAddress: a.EmailAddress, Name: a.Name }, { email: a.email }),
  },
  {
    name: "cm_delete_admin",
    description: "⚠️ Remove an administrator's access from the account.",
    category: "account",
    inputSchema: { email: z.string().email().describe("Email address of the administrator to remove.") },
    annotations: { destructiveHint: true },
    handler: (a, c) => c.delete("/admins", { email: a.email }),
  },
  {
    name: "cm_get_account_primary_contact",
    description: "Get the account's primary contact email address.",
    category: "account",
    inputSchema: {},
    annotations: RO,
    handler: (_a, c) => c.get("/primarycontact"),
  },
  {
    name: "cm_set_account_primary_contact",
    description: "Set the account's primary contact to an existing administrator.",
    category: "account",
    inputSchema: { email: z.string().email().describe("Email of the administrator to make primary contact.") },
    annotations: { idempotentHint: true },
    handler: (a, c) => c.put("/primarycontact", undefined, { email: a.email }),
  },
  {
    name: "cm_create_external_session",
    description:
      "Initiate an external single-sign-on login session for a member, returning a URL to the Campaign Monitor UI.",
    category: "account",
    inputSchema: {
      Email: z.string().email().describe("Email address of the member to log in."),
      Chrome: z
        .enum(["all", "tabs", "none"])
        .optional()
        .describe("How much of the Campaign Monitor chrome to show."),
      Url: z.string().optional().describe("Relative URL to redirect the member to after login."),
      IntegratorID: z.string().optional().describe("Your integrator ID, if applicable."),
      ClientID: z.string().optional().describe("Client ID to scope the session to."),
    },
    handler: (a, c) =>
      c.put("/externalsession", {
        Email: a.Email,
        Chrome: a.Chrome,
        Url: a.Url,
        IntegratorID: a.IntegratorID,
        ClientID: a.ClientID,
      }),
  },
];
