import { CATEGORIES } from "./categories";
import { today } from "./date";
import type { Expense } from "./types";

const HEADERS = [
  "Date",
  "Description",
  "Category",
  "Amount",
  "Created",
] as const;

/**
 * Escapes one CSV field.
 *
 * Also neutralizes formula injection: a value starting with `= + - @` (or tab/CR)
 * is executed as a formula when the file is opened in Excel or Sheets, so it gets
 * a leading apostrophe.
 */
function escapeField(value: string | number): string {
  const text = String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

export function expensesToCSV(expenses: Expense[]): string {
  const rows = [
    HEADERS.join(","),
    ...expenses.map((expense) =>
      [
        escapeField(expense.date),
        escapeField(expense.description),
        escapeField(CATEGORIES[expense.category].label),
        escapeField(expense.amount.toFixed(2)),
        escapeField(expense.createdAt),
      ].join(","),
    ),
  ];
  // CRLF is what Excel expects for a clean import.
  return rows.join("\r\n");
}

/** Columns for the dashboard's "Export Data" button. */
const SIMPLE_HEADERS = ["Date", "Category", "Amount", "Description"] as const;

/** Date, Category, Amount, Description — every expense, no filtering. */
export function expensesToSimpleCSV(expenses: Expense[]): string {
  const rows = [
    SIMPLE_HEADERS.join(","),
    ...expenses.map((expense) =>
      [
        escapeField(expense.date),
        escapeField(CATEGORIES[expense.category].label),
        escapeField(expense.amount.toFixed(2)),
        escapeField(expense.description),
      ].join(","),
    ),
  ];
  return rows.join("\r\n");
}

/** Builds the file and hands it to the browser via a temporary anchor. */
function triggerDownload(csv: string, filename: string): void {
  // The BOM makes Excel read the file as UTF-8 instead of the system codepage.
  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCSV(expenses: Expense[], filename?: string): void {
  triggerDownload(
    expensesToCSV(expenses),
    filename ?? `expenses-${today()}.csv`,
  );
}

/** The dashboard export: all expenses, four columns. */
export function downloadSimpleCSV(expenses: Expense[], filename?: string): void {
  triggerDownload(
    expensesToSimpleCSV(expenses),
    filename ?? `expenses-${today()}.csv`,
  );
}
