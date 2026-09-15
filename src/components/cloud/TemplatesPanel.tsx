"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { CloudUploadIcon, DownloadIcon } from "@/components/ui/Icons";
import { useCloudExport } from "@/context/CloudExportProvider";
import { useExpenses } from "@/context/ExpenseProvider";
import { DESTINATIONS, getDestination } from "@/lib/cloud/destinations";
import {
  TEMPLATES,
  applyTemplate,
  getTemplate,
  previewTemplate,
} from "@/lib/cloud/templates";
import type { DestinationId, TemplateId } from "@/lib/cloud/types";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";

interface TemplatesPanelProps {
  templateId: TemplateId;
  onTemplateChange: (id: TemplateId) => void;
  destinationId: DestinationId;
  onDestinationChange: (id: DestinationId) => void;
}

export function TemplatesPanel({
  templateId,
  onTemplateChange,
  destinationId,
  onDestinationChange,
}: TemplatesPanelProps) {
  const { expenses } = useExpenses();
  const { runExport, connections } = useCloudExport();

  const now = useMemo(() => new Date(), []);
  const template = getTemplate(templateId);
  const destination = getDestination(destinationId);

  const result = useMemo(
    () => applyTemplate(expenses, template, [], now),
    [expenses, template, now],
  );
  const preview = useMemo(
    () => previewTemplate(template, result),
    [template, result],
  );

  const connection = connections[destinationId];
  const needsConnection = !destination.real && connection?.state !== "connected";

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2">
        {TEMPLATES.map((item) => {
          const selected = item.id === templateId;
          const scoped = applyTemplate(expenses, item, [], now);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTemplateChange(item.id)}
              aria-pressed={selected}
              className={cn(
                "rounded-xl border p-3.5 text-left transition-all",
                selected
                  ? "border-transparent shadow-card"
                  : "border-border hover:border-border-strong hover:bg-surface-2",
              )}
              style={
                selected
                  ? {
                      backgroundColor: `color-mix(in srgb, ${item.accent} 10%, var(--surface))`,
                      boxShadow: `inset 0 0 0 1.5px ${item.accent}`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.accent }}
                />
                <span className="text-[13.5px] font-semibold text-primary">
                  {item.name}
                </span>
                <span className="ml-auto rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                  {item.fileType}
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-secondary">
                {item.purpose}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
                <span className="tabular-nums">{scoped.rows.length}</span>
                <span>{scoped.rows.length === 1 ? "row" : "rows"}</span>
                <span>·</span>
                <span className="tabular-nums">
                  {formatCurrency(scoped.total)}
                </span>
              </p>
            </button>
          );
        })}
      </div>

      {/* Preview of the selected template */}
      <section>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <h3 className="label mb-0">Preview</h3>
          <span className="text-[12.5px] text-muted">
            {template.audience} · {result.rangeLabel}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <thead>
              <tr className="bg-surface-2">
                {preview.headers.map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-3 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-secondary"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={preview.headers.length}
                    className="px-3 py-6 text-center text-[13px] text-muted"
                  >
                    No expenses in this template&apos;s window.
                  </td>
                </tr>
              ) : (
                preview.rows.map((row, index) => (
                  <tr key={index} className="border-t border-border">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="max-w-[180px] truncate px-3 py-2 text-[12.5px] text-primary"
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
      </section>

      {/* Destination + run */}
      <section>
        <h3 className="label">Send to</h3>
        <div className="flex flex-wrap gap-1.5">
          {DESTINATIONS.map((item) => {
            const selected = item.id === destinationId;
            const state = connections[item.id]?.state;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onDestinationChange(item.id)}
                aria-pressed={selected}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-all",
                  selected
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border text-secondary hover:border-border-strong hover:bg-surface-2",
                )}
              >
                {item.name}
                {!item.real && (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      state === "connected" ? "bg-good" : "bg-muted",
                    )}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {needsConnection && (
          <p className="mt-2 text-[12.5px] text-muted">
            {destination.name} isn&apos;t connected. Running this will use the
            simulated flow on the Connect tab.
          </p>
        )}

        <Button
          variant="primary"
          className="mt-3 w-full"
          disabled={result.rows.length === 0}
          onClick={() => runExport({ templateId, destinationId })}
          icon={
            destination.real ? (
              <DownloadIcon width={16} height={16} />
            ) : (
              <CloudUploadIcon width={16} height={16} />
            )
          }
        >
          {destination.real
            ? `Download ${template.name}`
            : `Send to ${destination.name}`}
        </Button>
      </section>
    </div>
  );
}
