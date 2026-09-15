import type { Cadence, ScheduleConfig } from "./types";

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const CADENCE_LABELS: Record<Cadence, string> = {
  off: "Not scheduled",
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
};

function parseTime(time: string): { hours: number; minutes: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return { hours: 9, minutes: 0 };
  return {
    hours: Math.min(23, Number(match[1])),
    minutes: Math.min(59, Number(match[2])),
  };
}

/**
 * The next time this schedule would fire.
 *
 * The date arithmetic is real — this is the genuine next occurrence, not a
 * placeholder string. What is *not* real is anything firing: a browser app has
 * no process alive when its tab is closed, so nothing here can run unattended.
 * The UI says so plainly rather than implying a backup is happening.
 */
export function nextRun(
  config: ScheduleConfig,
  now: Date = new Date(),
): Date | null {
  if (config.cadence === "off") return null;

  const { hours, minutes } = parseTime(config.time);

  if (config.cadence === "daily") {
    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
    );
    if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }

  if (config.cadence === "weekly") {
    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
    );
    const delta = (config.weekday - candidate.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + delta);
    if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
    return candidate;
  }

  // Monthly. dayOfMonth is capped at 28 by the UI so it exists in every month.
  const day = Math.min(Math.max(config.dayOfMonth, 1), 28);
  const candidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    day,
    hours,
    minutes,
  );
  if (candidate <= now) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

export function describeSchedule(config: ScheduleConfig): string {
  if (config.cadence === "off") return "No automatic exports";
  const time = config.time;
  if (config.cadence === "daily") return `Every day at ${time}`;
  if (config.cadence === "weekly") {
    return `Every ${WEEKDAYS[config.weekday] ?? "Monday"} at ${time}`;
  }
  return `Day ${config.dayOfMonth} of each month at ${time}`;
}

/** "in 4 hours", "in 3 days" — the countdown under the schedule summary. */
export function describeCountdown(target: Date, now: Date = new Date()): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "due now";

  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;

  const days = Math.round(hours / 24);
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}
