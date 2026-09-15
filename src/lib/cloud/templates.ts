import { resolveRange, totalOf } from "@/lib/analytics";
import { CATEGORIES } from "@/lib/categories";
import { formatMonthKey } from "@/lib/format";
import type { CategoryId, Expense } from "@/lib/types";

import type { ExportTemplate, TemplateId } from "./types";

const iso = (expense: Expense) => expense.date;
const category = (expense: Expense) => CATEGORIES[expense.category].label;
const amount = (expense: Expense) => expense.amount.toFixed(2);
const description = (expense: Expense) => expense.description;

/**
 * The four templates. These are not cosmetic labels — each one resolves to a
 * different date window, column set, and grouping, so the file you get from
 * "Tax Report" genuinely differs from "Monthly Summary".
 */
export const TEMPLATES: ExportTemplate[] = [
  {
    id: "tax-report",
    name: "Tax Report",
    purpose: "Every deductible-looking expense for the current tax year, itemized with dates.",
    audience: "For your accountant",
    fileType: "csv",
    preset: "this-year",
    aggregate: false,
    accent: "var(--cat-food)",
    columns: [
      { key: "date", label: "Date", value: iso },
      { key: "category", label: "Category", value: category },
      { key: "description", label: "Description", value: description },
      { key: "amount", label: "Amount (USD)", value: amount, numeric: true },
    ],
  },
  {
    id: "monthly-summary",
    name: "Monthly Summary",
    purpose: "This month's spending rolled up by category, with totals and shares.",
    audience: "For a budget review",
    fileType: "csv",
    preset: "this-month",
    aggregate: true,
    accent: "var(--cat-transportation)",
    columns: [
      { key: "category", label: "Category", value: category },
      { key: "amount", label: "Total", value: amount, numeric: true },
    ],
  },
  {
    id: "category-analysis",
    name: "Category Analysis",
    purpose: "Ninety days of spend grouped by category, with counts and averages.",
    audience: "For spotting trends",
    fileType: "json",
    preset: "last-90",
    aggregate: true,
    accent: "var(--cat-entertainment)",
    columns: [
      { key: "category", label: "Category", value: category },
      { key: "amount", label: "Total", value: amount, numeric: true },
    ],
  },
  {
    id: "full-ledger",
    name: "Full Ledger",
    purpose: "Everything you have ever recorded, unfiltered, with audit timestamps.",
    audience: "For a complete backup",
    fileType: "json",
    preset: "all",
    aggregate: false,
    accent: "var(--cat-bills)",
    columns: [
      { key: "date", label: "Date", value: iso },
      { key: "category", label: "Category", value: category },
      { key: "description", label: "Description", value: description },
      { key: "amount", label: "Amount", value: amount, numeric: true },
      { key: "createdAt", label: "Recorded", value: (e) => e.createdAt },
    ],
  },
];

export function getTemplate(id: TemplateId): ExportTemplate {
  const template = TEMPLATES.find((item) => item.id === id);
  if (!template) throw new Error(`Unknown template: ${id}`);
  return template;
}

export interface TemplateResult {
  rows: Expense[];
  total: number;
  rangeLabel: string;
}

/** Applies a template's window and the caller's category filter. */
export function applyTemplate(
  expenses: Expense[],
  template: ExportTemplate,
  categories: CategoryId[] = [],
  now: Date = new Date(),
): TemplateResult {
  const range = resolveRange(template.preset, "", "", now);
  const allowed = categories.length > 0 ? new Set(categories) : null;

  const rows = expenses
    .filter((expense) => {
      if (allowed && !allowed.has(expense.category)) return false;
      if (range.from && expense.date < range.from) return false;
      if (range.to && expense.date > range.to) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const rangeLabel =
    template.preset === "this-month"
      ? formatMonthKey(
          `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        )
      : template.preset === "this-year"
        ? `${now.getFullYear()}`
        : template.preset === "last-90"
          ? "Last 90 days"
          : "All time";

  return { rows, total: totalOf(rows), rangeLabel };
}

function escapeCsv(value: string): string {
  // Neutralize spreadsheet formula injection before quoting.
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

interface AggregateRow {
  category: string;
  total: number;
  count: number;
  average: number;
  share: number;
}

function aggregate(result: TemplateResult): AggregateRow[] {
  const buckets = new Map<string, { cents: number; count: number }>();
  for (const expense of result.rows) {
    const label = CATEGORIES[expense.category].label;
    const entry = buckets.get(label) ?? { cents: 0, count: 0 };
    entry.cents += Math.round(expense.amount * 100);
    entry.count += 1;
    buckets.set(label, entry);
  }

  return [...buckets.entries()]
    .map(([label, entry]) => ({
      category: label,
      total: entry.cents / 100,
      count: entry.count,
      average: entry.count > 0 ? entry.cents / 100 / entry.count : 0,
      share: result.total > 0 ? entry.cents / 100 / result.total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Serializes a template's result to its own file type. */
export function serializeTemplate(
  template: ExportTemplate,
  result: TemplateResult,
  now: Date = new Date(),
): Blob {
  if (template.fileType === "json") {
    const payload = template.aggregate
      ? {
          report: template.name,
          generatedAt: now.toISOString(),
          window: result.rangeLabel,
          total: result.total,
          categories: aggregate(result),
        }
      : {
          report: template.name,
          generatedAt: now.toISOString(),
          window: result.rangeLabel,
          total: result.total,
          count: result.rows.length,
          expenses: result.rows.map((expense) => ({
            date: expense.date,
            category: expense.category,
            categoryLabel: CATEGORIES[expense.category].label,
            amount: expense.amount,
            description: expense.description,
            recordedAt: expense.createdAt,
          })),
        };

    return new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
  }

  const lines: string[] = [];

  if (template.aggregate) {
    lines.push(["Category", "Total", "Expenses", "Average", "Share"].join(","));
    for (const row of aggregate(result)) {
      lines.push(
        [
          escapeCsv(row.category),
          row.total.toFixed(2),
          String(row.count),
          row.average.toFixed(2),
          `${Math.round(row.share * 100)}%`,
        ].join(","),
      );
    }
    lines.push(["Total", result.total.toFixed(2), String(result.rows.length), "", "100%"].join(","));
  } else {
    lines.push(template.columns.map((column) => escapeCsv(column.label)).join(","));
    for (const expense of result.rows) {
      lines.push(
        template.columns
          .map((column) => escapeCsv(column.value(expense)))
          .join(","),
      );
    }
  }

  return new Blob([`﻿${lines.join("\r\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
}

/** Preview rows for the template gallery — the same data the file will carry. */
export function previewTemplate(
  template: ExportTemplate,
  result: TemplateResult,
  limit = 4,
): { headers: string[]; rows: string[][] } {
  if (template.aggregate) {
    return {
      headers: ["Category", "Total", "Expenses", "Share"],
      rows: aggregate(result)
        .slice(0, limit)
        .map((row) => [
          row.category,
          row.total.toFixed(2),
          String(row.count),
          `${Math.round(row.share * 100)}%`,
        ]),
    };
  }

  return {
    headers: template.columns.map((column) => column.label),
    rows: result.rows
      .slice(0, limit)
      .map((expense) =>
        template.columns.map((column) => column.value(expense)),
      ),
  };
}
