import type { ResolvedRange } from "@/lib/analytics";
import type { CategoryId, DateRangePreset, Expense } from "@/lib/types";

export type ExportFormat = "csv" | "json" | "pdf";

/** Everything the dialog collects. One serializable object. */
export interface ExportOptions {
  format: ExportFormat;
  preset: DateRangePreset;
  /** Only consulted when `preset` is `custom`. */
  from: string;
  to: string;
  /** Empty means every category. */
  categories: CategoryId[];
  /** Base name, no extension — the format appends its own. */
  filename: string;
  /** PDF/JSON only: include a computed summary block alongside the rows. */
  includeSummary: boolean;
}

/** The resolved result of applying options to the store. */
export interface ExportSelection {
  rows: Expense[];
  total: number;
  range: ResolvedRange;
  /** Per-category totals for the rows in this selection, largest first. */
  byCategory: { id: CategoryId; label: string; total: number; count: number }[];
  /** Rows excluded by the current filters. */
  excluded: number;
}

/** Metadata stamped into the exported file itself. */
export interface ExportMeta {
  generatedAt: Date;
  rangeLabel: string;
  categoryLabel: string;
  includeSummary: boolean;
}

/**
 * A format plugs into the dialog by describing itself and knowing how to build
 * its own bytes. Adding a fourth format means adding one of these and
 * registering it — the dialog reads everything it renders off this contract.
 */
export interface ExportFormatSpec {
  id: ExportFormat;
  label: string;
  extension: string;
  mimeType: string;
  /** One line, shown under the format's name in the picker. */
  description: string;
  /** Column headings for the preview table. */
  columns: readonly string[];
  /** Maps one expense to its preview cells, in `columns` order. */
  previewRow: (expense: Expense) => string[];
  /** Whether the `includeSummary` toggle applies to this format. */
  supportsSummary: boolean;
  build: (
    selection: ExportSelection,
    meta: ExportMeta,
  ) => Blob | Promise<Blob>;
}
