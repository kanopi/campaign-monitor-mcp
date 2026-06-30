import type { ToolDef } from "../types.js";
import { accountTools } from "./account.js";
import { clientTools } from "./clients.js";
import { campaignTools } from "./campaigns.js";
import { listTools } from "./lists.js";
import { segmentTools } from "./segments.js";
import { subscriberTools } from "./subscribers.js";
import { templateTools } from "./templates.js";
import { transactionalTools } from "./transactional.js";
import { journeyTools } from "./journeys.js";

/** All tools across every category, mapped 1:1 to Campaign Monitor endpoints. */
export const allTools: ToolDef[] = [
  ...accountTools,
  ...clientTools,
  ...campaignTools,
  ...listTools,
  ...segmentTools,
  ...subscriberTools,
  ...templateTools,
  ...transactionalTools,
  ...journeyTools,
];
