"use client";

import { useEffect, useMemo, useReducer, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { AlertIcon, CheckIcon, DownloadIcon } from "@/components/ui/Icons";
import { useToast } from "@/context/ToastProvider";
import { describeRange } from "@/lib/analytics";
import { CATEGORY_LIST } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { today } from "@/lib/date";
import { formatCurrency } from "@/lib/format";
import {
  DEFAULT_EXPORT_OPTIONS,
  EXPORT_FORMATS,
  formatBytes,
  getFormat,
  runExport,
  sanitizeFilename,
  selectForExport,
  type ExportFormat,
  type ExportOptions,
} from "@/lib/export";
import type { CategoryId, DateRangePreset, Expense } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-30", label: "Last 30 days" },
  { value: "last-90", label: "Last 90 days" },
  { value: "this-year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

const PREVIEW_ROWS = 6;

type Action =
  | { type: "format"; value: ExportFormat }
  | { type: "preset"; value: DateRangePreset }
  | { type: "from"; value: string }
  | { type: "to"; value: string }
  | { type: "toggleCategory"; value: CategoryId }
  | { type: "allCategories" }
  | { type: "filename"; value: string }
  | { type: "includeSummary"; value: boolean }
  | { type: "reset" };

/**
 * All option state in one reducer rather than eight `useState` calls: the export
 * options are a single value that gets validated and serialized as a unit, and
 * keeping them together means the preview can never disagree with the file.
 */
function reducer(state: ExportOptions, action: Action): ExportOptions {
  switch (action.type) {
    case "format":
      return { ...state, format: action.value };
    case "preset":
      return { ...state, preset: action.value };
    case "from":
      return { ...state, from: action.value, preset: "custom" };
    case "to":
      return { ...state, to: action.value, preset: "custom" };
    case "toggleCategory": {
      const categories = state.categories.includes(action.value)
        ? state.categories.filter((id) => id !== action.value)
        : [...state.categories, action.value];
      return { ...state, categories };
    }
    case "allCategories":
      return { ...state, categories: [] };
    case "filename":
      return { ...state, filename: action.value };
    case "includeSummary":
      return { ...state, includeSummary: action.value };
    case "reset":
      return { ...DEFAULT_EXPORT_OPTIONS };
    default:
      return state;
  }
}

type Status = "idle" | "working" | "done";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  expenses: Expense[];
}

export function ExportDialog({ open, onClose, expenses }: ExportDialogProps) {
  const { toast } = useToast();
  const [options, dispatch] = useReducer(reducer, DEFAULT_EXPORT_OPTIONS);
  const [status, setStatus] = useState<Status>("idle");

  const now = useMemo(() => new Date(), []);

  // Reset to a clean slate each time the dialog opens.
  useEffect(() => {
    if (open) {
      dispatch({ type: "reset" });
      setStatus("idle");
    }
  }, [open]);

  const format = getFormat(options.format);

  /** The preview and the file are built from this same selection. */
  const selection = useMemo(
    () => selectForExport(expenses, options, now),
    [expenses, options, now],
  );

  const defaultName = `expenses-${today()}`;
  const effectiveName = `${sanitizeFilename(options.filename || defaultName)}.${format.extension}`;

  const customRangeInvalid =
    options.preset === "custom" &&
    Boolean(options.from) &&
    Boolean(options.to) &&
    options.from > options.to;

  const canExport =
    selection.rows.length > 0 && !customRangeInvalid && status !== "working";

  const handleExport = async () => {
    setStatus("working");
    try {
      const result = await runExport(
        expenses,
        { ...options, filename: options.filename || defaultName },
        now,
      );
      setStatus("done");
      toast({
        title: "Export ready",
        description: `${result.filename} · ${result.rowCount} ${
          result.rowCount === 1 ? "record" : "records"
        } · ${formatBytes(result.byteSize)}`,
        variant: "success",
      });
      // Let the success state read for a beat before the dialog closes.
      setTimeout(onClose, 600);
    } catch (error) {
      setStatus("idle");
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong building the file.",
        variant: "error",
      });
    }
  };

  const previewRows = selection.rows.slice(0, PREVIEW_ROWS);

  return (
    <Modal
      open={open}
      onClose={status === "working" ? () => {} : onClose}
      title="Export expenses"
      description="Choose a format, narrow the data, and check the preview before downloading."
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-secondary" aria-live="polite">
            {customRangeInvalid ? (
              <span className="inline-flex items-center gap-1.5 text-danger">
                <AlertIcon width={15} height={15} />
                Start date is after the end date
              </span>
            ) : selection.rows.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-danger">
                <AlertIcon width={15} height={15} />
                Nothing matches these filters
              </span>
            ) : (
              <>
                <span className="font-medium tabular-nums text-primary">
                  {selection.rows.length}
                </span>{" "}
                {selection.rows.length === 1 ? "record" : "records"} ·{" "}
                <span className="font-medium tabular-nums text-primary">
                  {formatCurrency(selection.total)}
                </span>
                {selection.excluded > 0 && (
                  <span className="text-muted">
                    {" "}
                    · {selection.excluded} excluded
                  </span>
                )}
              </>
            )}
          </p>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={status === "working"}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={!canExport}
              loading={status === "working"}
              icon={
                status === "done" ? (
                  <CheckIcon width={16} height={16} />
                ) : (
                  <DownloadIcon width={16} height={16} />
                )
              }
            >
              {status === "working"
                ? "Preparing..."
                : status === "done"
                  ? "Downloaded"
                  : `Export ${format.label}`}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ---- Format ---- */}
        <section>
          <h3 className="label">Format</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {EXPORT_FORMATS.map((spec) => {
              const selected = options.format === spec.id;
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => dispatch({ type: "format", value: spec.id })}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    selected
                      ? "border-brand bg-brand-soft"
                      : "border-border hover:border-border-strong hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "block text-[13px] font-semibold",
                      selected ? "text-brand" : "text-primary",
                    )}
                  >
                    {spec.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-secondary">
                    {spec.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---- Date range ---- */}
        <section>
          <h3 className="label">Date range</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={options.preset}
              onChange={(event) =>
                dispatch({
                  type: "preset",
                  value: event.target.value as DateRangePreset,
                })
              }
              aria-label="Date range preset"
              className="field cursor-pointer sm:w-48"
            >
              {PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>

            <div className="flex flex-1 items-center gap-2">
              <input
                type="date"
                value={options.from}
                onChange={(event) =>
                  dispatch({ type: "from", value: event.target.value })
                }
                aria-label="Start date"
                className={cn("field", customRangeInvalid && "field-invalid")}
              />
              <span className="shrink-0 text-[13px] text-muted">to</span>
              <input
                type="date"
                value={options.to}
                onChange={(event) =>
                  dispatch({ type: "to", value: event.target.value })
                }
                aria-label="End date"
                className={cn("field", customRangeInvalid && "field-invalid")}
              />
            </div>
          </div>
          <p className="mt-1.5 text-[12.5px] text-muted">
            {describeRange(selection.range)}
            {options.preset !== "custom" && " · editing a date switches to a custom range"}
          </p>
        </section>

        {/* ---- Categories ---- */}
        <section>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <h3 className="label mb-0">Categories</h3>
            {options.categories.length > 0 && (
              <button
                type="button"
                onClick={() => dispatch({ type: "allCategories" })}
                className="text-[12.5px] font-medium text-brand transition-opacity hover:opacity-80"
              >
                Select all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_LIST.map((category) => {
              // No selection means everything, so show them all as active.
              const active =
                options.categories.length === 0 ||
                options.categories.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    dispatch({ type: "toggleCategory", value: category.id })
                  }
                  aria-pressed={options.categories.includes(category.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-all",
                    active
                      ? "border-transparent text-primary"
                      : "border-border text-muted hover:border-border-strong",
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: `color-mix(in srgb, ${category.color} 14%, var(--surface))`,
                          boxShadow: `inset 0 0 0 1.5px ${category.color}`,
                        }
                      : undefined
                  }
                >
                  <CategoryIcon
                    category={category.id}
                    width={14}
                    height={14}
                    style={{ color: active ? category.color : undefined }}
                  />
                  {category.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[12.5px] text-muted">
            {options.categories.length === 0
              ? "All categories included"
              : `${options.categories.length} of ${CATEGORY_LIST.length} selected`}
          </p>
        </section>

        {/* ---- Filename + options ---- */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="export-filename" className="label">
              Filename
            </label>
            <div className="flex items-center gap-2">
              <input
                id="export-filename"
                type="text"
                value={options.filename}
                onChange={(event) =>
                  dispatch({ type: "filename", value: event.target.value })
                }
                placeholder={defaultName}
                autoComplete="off"
                className="field"
              />
              <span className="shrink-0 text-[13px] tabular-nums text-muted">
                .{format.extension}
              </span>
            </div>
            <p className="mt-1.5 truncate text-[12.5px] text-muted">
              Saves as {effectiveName}
            </p>
          </div>

          {format.supportsSummary && (
            <div>
              <h3 className="label">Options</h3>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-2.5 transition-colors hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={options.includeSummary}
                  onChange={(event) =>
                    dispatch({
                      type: "includeSummary",
                      value: event.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
                />
                <span className="text-[12.5px] leading-snug text-secondary">
                  <span className="block font-medium text-primary">
                    Include summary
                  </span>
                  Per-category totals alongside the records
                </span>
              </label>
            </div>
          )}
        </section>

        {/* ---- Preview ---- */}
        <section>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <h3 className="label mb-0">Preview</h3>
            <span className="text-[12.5px] text-muted">
              {selection.rows.length === 0
                ? "Nothing to show"
                : `First ${Math.min(PREVIEW_ROWS, selection.rows.length)} of ${selection.rows.length}`}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[440px] border-collapse text-left">
              <thead>
                <tr className="bg-surface-2">
                  {format.columns.map((column, index) => (
                    <th
                      key={column}
                      scope="col"
                      className={cn(
                        "px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-secondary",
                        index === 2 && "text-right",
                      )}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={format.columns.length}
                      className="px-3 py-6 text-center text-[13px] text-muted"
                    >
                      No records match the current filters.
                    </td>
                  </tr>
                ) : (
                  previewRows.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-t border-border"
                    >
                      {format.previewRow(expense).map((cell, index) => (
                        <td
                          key={index}
                          className={cn(
                            "px-3 py-2 text-[13px] text-primary",
                            index === 2 && "text-right tabular-nums",
                            index === 3 && "max-w-[220px] truncate",
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selection.rows.length > PREVIEW_ROWS && (
            <p className="mt-1.5 text-[12.5px] text-muted">
              {selection.rows.length - PREVIEW_ROWS} more{" "}
              {selection.rows.length - PREVIEW_ROWS === 1 ? "record" : "records"}{" "}
              will be included in the file.
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
