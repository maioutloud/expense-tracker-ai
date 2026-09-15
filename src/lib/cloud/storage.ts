import type {
  ConnectionRecord,
  DestinationId,
  HistoryEntry,
  ScheduleConfig,
} from "./types";

const HISTORY_KEY = "expense-tracker:export-history:v1";
const SCHEDULE_KEY = "expense-tracker:export-schedule:v1";
const CONNECTIONS_KEY = "expense-tracker:export-connections:v1";

const MAX_HISTORY = 50;

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  cadence: "off",
  weekday: 1,
  dayOfMonth: 1,
  time: "09:00",
  templateId: "monthly-summary",
  destinationId: "download",
  categories: [],
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // A corrupt entry should never take the panel down with it.
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Persisting these is best-effort; the session still works without it. */
  }
}

/* ------------------------------- history ------------------------------ */

export function loadHistory(): HistoryEntry[] {
  const entries = read<HistoryEntry[]>(HISTORY_KEY, []);
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (entry) =>
      entry &&
      typeof entry.id === "string" &&
      typeof entry.exportedAt === "string",
  );
}

export function appendHistory(entry: HistoryEntry): HistoryEntry[] {
  // Newest first, capped — this is a log, not an archive.
  const next = [entry, ...loadHistory()].slice(0, MAX_HISTORY);
  write(HISTORY_KEY, next);
  return next;
}

export function clearHistory(): void {
  write(HISTORY_KEY, []);
}

/* ------------------------------ schedule ------------------------------ */

export function loadSchedule(): ScheduleConfig {
  return { ...DEFAULT_SCHEDULE, ...read<Partial<ScheduleConfig>>(SCHEDULE_KEY, {}) };
}

export function saveSchedule(config: ScheduleConfig): void {
  write(SCHEDULE_KEY, config);
}

/* ---------------------------- connections ----------------------------- */

export type ConnectionMap = Partial<Record<DestinationId, ConnectionRecord>>;

export function loadConnections(): ConnectionMap {
  return read<ConnectionMap>(CONNECTIONS_KEY, {});
}

export function saveConnections(map: ConnectionMap): void {
  write(CONNECTIONS_KEY, map);
}
