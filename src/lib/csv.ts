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

export function downloadCSV(expenses: Expense[], filename?: string): void {
  const csv = expensesToCSV(expenses);
  // The BOM makes Excel read the file as UTF-8 instead of the system codepage.
  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? `expenses-${today()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
