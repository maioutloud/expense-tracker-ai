import { today } from "@/lib/date";

import type { Destination, ExportTemplate } from "./types";

export function createJobId(): string {
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildFilename(
  template: ExportTemplate,
  stamp: string = today(),
): string {
  const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${slug}-${stamp}.${template.fileType}`;
}

/** Writes a Blob to disk through a temporary anchor. The one real destination. */
export function deliverDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * How long each scripted step of a simulated transfer takes.
 *
 * Varied rather than uniform so the progress bar doesn't move with the obvious
 * tick of a fake timer — but this is theatre for a flow that moves no data, and
 * the panel labels it as such.
 */
export function stepDuration(index: number, total: number): number {
  if (index === 0) return 420;
  if (index === total - 1) return 260;
  return 300 + ((index * 137) % 220);
}

export function isSimulated(destination: Destination): boolean {
  return !destination.real;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "2 minutes ago", "3 days ago" — relative stamps for the history log. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";

  const seconds = Math.round((now.getTime() - then) / 1000);
  if (seconds < 45) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
