import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "crontab-generator",
  slug: "crontab-generator",
  description: "Generate cron expressions from natural language descriptions.",
  version: "1.0.0",
  routes: [
    {
      method: "POST",
      path: "/api/generate",
      price: "$0.001",
      description: "Generate a cron expression from natural language",
      toolName: "utility_generate_crontab",
      toolDescription: "Use this when you need to generate a cron expression from a natural language description like 'every Monday at 9am' or 'every 5 minutes'. Returns the cron expression, a human-readable explanation, and next 5 execution times. Do NOT use for parsing existing cron expressions — use utility_parse_cron instead. Do NOT use for scheduling tasks — use utility_schedule_task instead.",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string", description: "Natural language description of the schedule (e.g. 'every Monday at 9am', 'twice a day', 'every 5 minutes')" },
        },
        required: ["description"],
      },
    },
  ],
};
