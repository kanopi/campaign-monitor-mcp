import { z } from "zod";

/**
 * Standard paging/ordering query params shared by Campaign Monitor's report
 * and subscriber-listing endpoints.
 */
export const pagingShape = {
  page: z.number().int().positive().optional().describe("Page number to fetch (1-based)."),
  pagesize: z
    .number()
    .int()
    .positive()
    .max(1000)
    .optional()
    .describe("Number of records per page (default 1000, max 1000)."),
  orderfield: z
    .string()
    .optional()
    .describe("Field to order results by (e.g. 'email', 'name', 'date')."),
  orderdirection: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Order direction: 'asc' or 'desc'."),
};

/** `date` filter accepted by report and subscriber-list endpoints. */
export const dateShape = {
  date: z
    .string()
    .optional()
    .describe("Only return records added/changed since this date (YYYY-MM-DD or with time)."),
};

/** Pull the standard paging keys out of an args object into a query object. */
export function pagingQuery(args: Record<string, unknown>): Record<string, unknown> {
  const { page, pagesize, orderfield, orderdirection, date } = args;
  return { page, pagesize, orderfield, orderdirection, date };
}
