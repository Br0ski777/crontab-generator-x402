import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "crontab-generator",
  slug: "crontab-generator",
  description: "Convert natural language like 'every Monday at 9am' into valid cron expressions with explanation and next run times.",
  version: "1.0.0",
  routes: [
    {
      method: "POST",
      path: "/api/generate",
      price: "$0.001",
      description: "Generate a cron expression from natural language",
      toolName: "utility_generate_crontab",
      toolDescription: `Use this when you need to generate a cron expression from a natural language description like "every Monday at 9am" or "every 5 minutes". Returns the cron expression with validation.

1. expression -- the generated cron expression (e.g. "0 9 * * 1")
2. description -- human-readable confirmation of the schedule
3. nextRuns -- next 5 execution timestamps in UTC
4. confidence -- how confident the parser is in the interpretation (high, medium, low)

Example output: {"expression":"0 9 * * 1","description":"Every Monday at 9:00 AM","nextRuns":["2026-04-14T09:00:00Z","2026-04-21T09:00:00Z"],"confidence":"high"}

Use this FOR creating new scheduled tasks from user instructions, building crontab configs from plain English, or translating business requirements into cron syntax. Use this BEFORE writing cron entries manually.

Do NOT use for parsing existing cron expressions -- use schedule_parse_cron instead. Do NOT use for JSON validation -- use data_validate_json instead. Do NOT use for text analysis -- use text_count_words instead.`,
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
