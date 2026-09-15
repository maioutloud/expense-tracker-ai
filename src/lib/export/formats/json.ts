import { CATEGORIES } from "@/lib/categories";
import { formatDate } from "@/lib/format";

import type { ExportFormatSpec } from "../types";

const COLUMNS = ["Date", "Category", "Amount", "Description"] as const;

/**
 * Structured export for re-import or scripting.
 *
 * Deliberately not a raw dump of the stored records: it carries a schema version
 * and an `exportedAt` stamp so a future importer can tell what it's looking at,
 * and it drops the internal `updatedAt` bookkeeping that means nothing outside
 * the app.
 */
export const jsonFormat: ExportFormatSpec = {
  id: "json",
  label: "JSON",
  extension: "json",
  mimeType: "application/json;charset=utf-8;",
  description: "Structured data with metadata. For scripts and re-import.",
  columns: COLUMNS,
  previewRow: (expense) => [
    formatDate(expense.date),
    CATEGORIES[expense.category].label,
    expense.amount.toFixed(2),
    expense.description,
  ],
  supportsSummary: true,

  build(selection, meta) {
    const payload: Record<string, unknown> = {
      schema: "ledger.expenses/v1",
      exportedAt: meta.generatedAt.toISOString(),
      filters: {
        range: meta.rangeLabel,
        from: selection.range.from,
        to: selection.range.to,
        categories: meta.categoryLabel,
      },
      count: selection.rows.length,
      expenses: selection.rows.map((expense) => ({
        date: expense.date,
        category: expense.category,
        categoryLabel: CATEGORIES[expense.category].label,
        amount: expense.amount,
        description: expense.description,
        createdAt: expense.createdAt,
      })),
    };

    if (meta.includeSummary) {
      payload.summary = {
        total: selection.total,
        byCategory: selection.byCategory.map((entry) => ({
          category: entry.id,
          label: entry.label,
          total: entry.total,
          count: entry.count,
        })),
      };
    }

    return new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
  },
};
