import { CATEGORIES } from "@/lib/categories";
import { formatDate } from "@/lib/format";

import type { ExportFormatSpec } from "../types";

const COLUMNS = ["Date", "Category", "Amount", "Description"] as const;

/**
 * Escapes one CSV field.
 *
 * Also neutralizes formula injection: a value starting with `= + - @` (or tab/CR)
 * executes as a formula when opened in Excel or Sheets, so it gets a leading
 * apostrophe.
 */
function escapeField(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

export const csvFormat: ExportFormatSpec = {
  id: "csv",
  label: "CSV",
  extension: "csv",
  mimeType: "text/csv;charset=utf-8;",
  description: "Spreadsheet-ready. Opens in Excel, Sheets, or Numbers.",
  columns: COLUMNS,
  previewRow: (expense) => [
    formatDate(expense.date),
    CATEGORIES[expense.category].label,
    expense.amount.toFixed(2),
    expense.description,
  ],
  supportsSummary: false,

  build(selection) {
    const lines = [
      COLUMNS.join(","),
      ...selection.rows.map((expense) =>
        [
          escapeField(expense.date),
          escapeField(CATEGORIES[expense.category].label),
          escapeField(expense.amount.toFixed(2)),
          escapeField(expense.description),
        ].join(","),
      ),
    ];

    // CRLF line endings and a UTF-8 BOM are what Excel expects.
    return new Blob([`﻿${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
  },
};
