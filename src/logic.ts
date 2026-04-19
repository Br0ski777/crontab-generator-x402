import type { Hono } from "hono";


// ATXP: requirePayment only fires inside an ATXP context (set by atxpHono middleware).
// For raw x402 requests, the existing @x402/hono middleware handles the gate.
// If neither protocol is active (ATXP_CONNECTION unset), tryRequirePayment is a no-op.
async function tryRequirePayment(price: number): Promise<void> {
  if (!process.env.ATXP_CONNECTION) return;
  try {
    const { requirePayment } = await import("@atxp/server");
    const BigNumber = (await import("bignumber.js")).default;
    await requirePayment({ price: BigNumber(price) });
  } catch (e: any) {
    if (e?.code === -30402) throw e;
  }
}

interface CronResult {
  expression: string;
  explanation: string;
}

function parseToCron(desc: string): CronResult {
  const d = desc.toLowerCase().trim();

  // Every N minutes
  let m = d.match(/every\s+(\d+)\s+minute/);
  if (m) return { expression: `*/${m[1]} * * * *`, explanation: `Every ${m[1]} minutes` };

  // Every N hours
  m = d.match(/every\s+(\d+)\s+hour/);
  if (m) return { expression: `0 */${m[1]} * * *`, explanation: `Every ${m[1]} hours` };

  // Every minute
  if (/every\s+minute/.test(d)) return { expression: "* * * * *", explanation: "Every minute" };

  // Every hour
  if (/every\s+hour|hourly/.test(d)) return { expression: "0 * * * *", explanation: "Every hour at minute 0" };

  // Every day at HH:MM or HH am/pm
  m = d.match(/(?:every\s+day\s+)?at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
  if (m) {
    let hour = parseInt(m[1]);
    const minute = m[2] ? parseInt(m[2]) : 0;
    if (m[3] === "pm" && hour < 12) hour += 12;
    if (m[3] === "am" && hour === 12) hour = 0;
    return { expression: `${minute} ${hour} * * *`, explanation: `Every day at ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}` };
  }

  // Days of week
  const dayMap: Record<string, string> = {
    sunday: "0", monday: "1", tuesday: "2", wednesday: "3",
    thursday: "4", friday: "5", saturday: "6",
    sun: "0", mon: "1", tue: "2", wed: "3", thu: "4", fri: "5", sat: "6",
  };

  // Every [day] at [time]
  for (const [name, num] of Object.entries(dayMap)) {
    const re = new RegExp(`every\\s+${name}\\s+at\\s+(\\d{1,2}):?(\\d{2})?\\s*(am|pm)?`);
    m = d.match(re);
    if (m) {
      let hour = parseInt(m[1]);
      const minute = m[2] ? parseInt(m[2]) : 0;
      if (m[3] === "pm" && hour < 12) hour += 12;
      if (m[3] === "am" && hour === 12) hour = 0;
      return { expression: `${minute} ${hour} * * ${num}`, explanation: `Every ${name} at ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}` };
    }
  }

  // Every [day] (no time)
  for (const [name, num] of Object.entries(dayMap)) {
    if (d.includes(name)) {
      return { expression: `0 0 * * ${num}`, explanation: `Every ${name} at midnight` };
    }
  }

  // Weekdays
  if (/weekday|monday.+friday|business\s+day/.test(d)) {
    m = d.match(/at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    let hour = 9, minute = 0;
    if (m) {
      hour = parseInt(m[1]);
      minute = m[2] ? parseInt(m[2]) : 0;
      if (m[3] === "pm" && hour < 12) hour += 12;
      if (m[3] === "am" && hour === 12) hour = 0;
    }
    return { expression: `${minute} ${hour} * * 1-5`, explanation: `Every weekday at ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}` };
  }

  // Twice a day
  if (/twice\s+a\s+day/.test(d)) return { expression: "0 9,18 * * *", explanation: "Twice a day at 09:00 and 18:00" };

  // Every day / daily
  if (/every\s+day|daily/.test(d)) {
    return { expression: "0 0 * * *", explanation: "Every day at midnight" };
  }

  // Every week / weekly
  if (/every\s+week|weekly/.test(d)) return { expression: "0 0 * * 0", explanation: "Every week on Sunday at midnight" };

  // Every month / monthly
  if (/every\s+month|monthly/.test(d)) return { expression: "0 0 1 * *", explanation: "First day of every month at midnight" };

  // Every year / yearly / annually
  if (/every\s+year|yearly|annually/.test(d)) return { expression: "0 0 1 1 *", explanation: "January 1st every year at midnight" };

  // Midnight
  if (/midnight/.test(d)) return { expression: "0 0 * * *", explanation: "Every day at midnight" };

  // Noon
  if (/noon/.test(d)) return { expression: "0 12 * * *", explanation: "Every day at noon" };

  // Every N days
  m = d.match(/every\s+(\d+)\s+day/);
  if (m) return { expression: `0 0 */${m[1]} * *`, explanation: `Every ${m[1]} days at midnight` };

  // Fallback
  return { expression: "0 0 * * *", explanation: "Default: every day at midnight (could not parse input precisely)" };
}

function getNextExecutions(expression: string, count: number = 5): string[] {
  const [minStr, hourStr, domStr, monStr, dowStr] = expression.split(" ");
  const results: string[] = [];
  const now = new Date();
  const check = new Date(now);

  for (let i = 0; i < 525600 && results.length < count; i++) {
    check.setTime(now.getTime() + i * 60000);

    const min = check.getMinutes();
    const hour = check.getHours();
    const dom = check.getDate();
    const mon = check.getMonth() + 1;
    const dow = check.getDay();

    if (!matchField(minStr, min, 0, 59)) continue;
    if (!matchField(hourStr, hour, 0, 23)) continue;
    if (!matchField(domStr, dom, 1, 31)) continue;
    if (!matchField(monStr, mon, 1, 12)) continue;
    if (!matchField(dowStr, dow, 0, 6)) continue;

    results.push(check.toISOString());
  }
  return results;
}

function matchField(field: string, value: number, min: number, max: number): boolean {
  if (field === "*") return true;
  // */N
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2));
    return value % step === 0;
  }
  // ranges with comma: 1,3,5
  if (field.includes(",")) {
    return field.split(",").some((v) => parseInt(v) === value);
  }
  // range: 1-5
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number);
    return value >= start && value <= end;
  }
  return parseInt(field) === value;
}

export function registerRoutes(app: Hono) {
  app.post("/api/generate", async (c) => {
    await tryRequirePayment(0.001);
    const body = await c.req.json().catch(() => null);
    if (!body?.description) {
      return c.json({ error: "Missing required field: description" }, 400);
    }

    const result = parseToCron(body.description);
    const nextExecutions = getNextExecutions(result.expression);

    return c.json({
      expression: result.expression,
      explanation: result.explanation,
      input: body.description,
      nextExecutions,
    });
  });
}
