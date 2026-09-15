import type { CategoryId, DateRangePreset, Expense } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

export type TemplateId =
  | "tax-report"
  | "monthly-summary"
  | "category-analysis"
  | "full-ledger";

export type TemplateFileType = "csv" | "json";

/**
 * A template is a named, opinionated export: a date window, a column set, and
 * a sort. These are real — picking one genuinely changes the file you get.
 */
export interface ExportTemplate {
  id: TemplateId;
  name: string;
  purpose: string;
  /** Who this is for, in one line. */
  audience: string;
  fileType: TemplateFileType;
  preset: DateRangePreset;
  columns: readonly TemplateColumn[];
  /** Roll rows up by category instead of listing them individually. */
  aggregate: boolean;
  accent: string;
}

export interface TemplateColumn {
  key: string;
  label: string;
  value: (expense: Expense) => string;
  numeric?: boolean;
}

/* ------------------------------------------------------------------ *
 * Destinations
 * ------------------------------------------------------------------ */

export type DestinationId =
  | "download"
  | "email"
  | "google-sheets"
  | "google-drive"
  | "dropbox"
  | "onedrive";

export type ConnectionState = "disconnected" | "connecting" | "connected";

export interface Destination {
  id: DestinationId;
  name: string;
  blurb: string;
  /** brand-ish accent for the service tile */
  accent: string;
  /**
   * False for every destination except `download`. Simulated destinations run a
   * scripted connect-and-transfer flow and never touch the network — the UI says
   * so wherever one appears.
   */
  real: boolean;
  /** Extra field the connect flow collects, if any. */
  requires?: "email" | "folder";
}

/* ------------------------------------------------------------------ *
 * Jobs
 * ------------------------------------------------------------------ */

export type JobState = "queued" | "running" | "succeeded" | "failed";

export interface ExportJob {
  id: string;
  templateId: TemplateId;
  destinationId: DestinationId;
  templateName: string;
  destinationName: string;
  state: JobState;
  /** 0–1 */
  progress: number;
  /** What the job is doing right now, for the status line. */
  step: string;
  rowCount: number;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  simulated: boolean;
}

/* ------------------------------------------------------------------ *
 * History
 * ------------------------------------------------------------------ */

export interface HistoryEntry {
  id: string;
  templateId: TemplateId;
  templateName: string;
  destinationId: DestinationId;
  destinationName: string;
  filename: string;
  rowCount: number;
  total: number;
  byteSize: number;
  exportedAt: string;
  simulated: boolean;
}

/* ------------------------------------------------------------------ *
 * Schedules
 * ------------------------------------------------------------------ */

export type Cadence = "off" | "daily" | "weekly" | "monthly";

export interface ScheduleConfig {
  cadence: Cadence;
  /** 0–6, Sunday-first. Used by `weekly`. */
  weekday: number;
  /** 1–28. Used by `monthly`. */
  dayOfMonth: number;
  /** "HH:MM", 24-hour, local time. */
  time: string;
  templateId: TemplateId;
  destinationId: DestinationId;
  categories: CategoryId[];
}

export interface ConnectionRecord {
  state: ConnectionState;
  /** Account identifier the mock flow captured, e.g. an email or folder path. */
  account?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}
