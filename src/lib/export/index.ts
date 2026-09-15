import type { Expense } from "@/lib/types";

import { csvFormat } from "./formats/csv";
import { jsonFormat } from "./formats/json";
import { pdfFormat } from "./formats/pdf";
import { buildExportMeta, resolveFilename, selectForExport } from "./select";
import type { ExportFormat, ExportFormatSpec, ExportOptions } from "./types";

export * from "./types";
export {
  DEFAULT_EXPORT_OPTIONS,
  buildExportMeta,
  resolveFilename,
  sanitizeFilename,
  selectForExport,
} from "./select";

/**
 * The format registry. The dialog renders itself entirely from this list — the
 * picker, the preview columns, the summary toggle — so a fourth format is one
 * spec object and one line here, with no UI changes.
 */
export const EXPORT_FORMATS: ExportFormatSpec[] = [
  csvFormat,
  jsonFormat,
  pdfFormat,
];

export function getFormat(id: ExportFormat): ExportFormatSpec {
  const spec = EXPORT_FORMATS.find((format) => format.id === id);
  if (!spec) throw new Error(`Unknown export format: ${id}`);
  return spec;
}

export interface ExportResult {
  filename: string;
  rowCount: number;
  byteSize: number;
}

/** Hands a finished Blob to the browser through a temporary anchor. */
function deliver(blob: Blob, filename: string): void {
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

/**
 * Runs one export end to end.
 *
 * Async for a real reason, not for a fake delay: serializing a few thousand rows
 * to PDF blocks the main thread, and without yielding first the browser never
 * paints the spinner that is supposed to explain the pause. The single `await`
 * below gives the UI one frame to render the busy state before the work starts.
 */
export async function runExport(
  expenses: Expense[],
  options: ExportOptions,
  now: Date = new Date(),
): Promise<ExportResult> {
  const format = getFormat(options.format);
  const selection = selectForExport(expenses, options, now);
  const meta = buildExportMeta(options, selection, now);

  // Yield so the busy state paints before the serializer takes the thread.
  await new Promise((resolve) => setTimeout(resolve, 0));

  const blob = await format.build(selection, meta);
  const filename = resolveFilename(options, format.extension);

  deliver(blob, filename);

  return {
    filename,
    rowCount: selection.rows.length,
    byteSize: blob.size,
  };
}

/** Human-readable file size for the dialog's summary line. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
