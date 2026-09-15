import { describeRange, resolveRange, totalOf } from "@/lib/analytics";
import { CATEGORIES, CATEGORY_LIST } from "@/lib/categories";
import { today } from "@/lib/date";
import type { CategoryId, Expense } from "@/lib/types";

import type { ExportMeta, ExportOptions, ExportSelection } from "./types";

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "csv",
  preset: "all",
  from: "",
  to: "",
  categories: [],
  filename: "",
  includeSummary: true,
};

/**
 * Applies the dialog's options to the expense store.
 *
 * Deliberately separate from the UI and from every serializer: the dialog shows
 * a preview by calling this, and the export writes a file from the same call, so
 * what you see previewed is exactly what lands in the file.
 */
export function selectForExport(
  expenses: Expense[],
  options: ExportOptions,
  now: Date = new Date(),
): ExportSelection {
  const range = resolveRange(options.preset, options.from, options.to, now);
  const categorySet =
    options.categories.length > 0 ? new Set(options.categories) : null;

  const rows = expenses
    .filter((expense) => {
      if (categorySet && !categorySet.has(expense.category)) return false;
      if (range.from && expense.date < range.from) return false;
      if (range.to && expense.date > range.to) return false;
      return true;
    })
    // Exports read top-to-bottom chronologically; the app's list is newest-first.
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  const totals = new Map<CategoryId, { cents: number; count: number }>();
  for (const row of rows) {
    const entry = totals.get(row.category) ?? { cents: 0, count: 0 };
    entry.cents += Math.round(row.amount * 100);
    entry.count += 1;
    totals.set(row.category, entry);
  }

  const byCategory = CATEGORY_LIST.filter((meta) => totals.has(meta.id))
    .map((meta) => {
      const entry = totals.get(meta.id)!;
      return {
        id: meta.id,
        label: meta.label,
        total: entry.cents / 100,
        count: entry.count,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    rows,
    total: totalOf(rows),
    range,
    byCategory,
    excluded: expenses.length - rows.length,
  };
}

export function buildExportMeta(
  options: ExportOptions,
  selection: ExportSelection,
  now: Date = new Date(),
): ExportMeta {
  return {
    generatedAt: now,
    rangeLabel: describeRange(selection.range),
    categoryLabel:
      options.categories.length === 0
        ? "All categories"
        : options.categories.map((id) => CATEGORIES[id].label).join(", "),
    includeSummary: options.includeSummary,
  };
}

/**
 * Makes a user-typed name safe for a filesystem.
 *
 * Strips path separators and the characters Windows reserves, collapses runs of
 * whitespace, and trims trailing dots (which Windows silently drops). Falls back
 * to a dated default when nothing usable survives.
 */
export function sanitizeFilename(input: string): string {
  const cleaned = input
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "")
    .slice(0, 80)
    .trim();

  return cleaned || `expenses-${today()}`;
}

/** The name shown in the dialog and used for the download. */
export function resolveFilename(
  options: ExportOptions,
  extension: string,
): string {
  return `${sanitizeFilename(options.filename)}.${extension}`;
}
