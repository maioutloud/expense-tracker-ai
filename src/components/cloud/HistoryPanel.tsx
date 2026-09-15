"use client";

import { Button } from "@/components/ui/Button";
import { HistoryIcon, TrashIcon } from "@/components/ui/Icons";
import { EmptyState } from "@/components/ui/States";
import { useCloudExport } from "@/context/CloudExportProvider";
import { formatBytes, timeAgo } from "@/lib/cloud/jobs";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";

export function HistoryPanel() {
  const { history, clearHistory, runExport } = useCloudExport();

  if (history.length === 0) {
    return (
      <EmptyState
        icon={<HistoryIcon width={20} height={20} />}
        title="No exports yet"
        description="Every export you run is logged here with its timestamp, size, and row count."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-secondary">
          <span className="font-medium tabular-nums text-primary">
            {history.length}
          </span>{" "}
          {history.length === 1 ? "export" : "exports"} logged on this device
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          icon={<TrashIcon width={15} height={15} />}
          className="hover:text-danger"
        >
          Clear log
        </Button>
      </div>

      <ol className="space-y-2">
        {history.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-border p-3.5 transition-colors hover:border-border-strong"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-[13px] font-semibold text-primary">
                {entry.templateName}
              </span>
              <span className="text-[12px] text-muted">→</span>
              <span className="text-[12.5px] text-secondary">
                {entry.destinationName}
              </span>
              {entry.simulated && (
                <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                  Simulated
                </span>
              )}
              <span className="ml-auto shrink-0 text-[12px] tabular-nums text-muted">
                {timeAgo(entry.exportedAt)}
              </span>
            </div>

            <p className="mt-1.5 truncate font-mono text-[11.5px] text-muted">
              {entry.filename}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-secondary">
              <span className="tabular-nums">
                {entry.rowCount} {entry.rowCount === 1 ? "row" : "rows"}
              </span>
              <span className="text-muted">·</span>
              <span className="tabular-nums">{formatCurrency(entry.total)}</span>
              <span className="text-muted">·</span>
              <span className="tabular-nums">{formatBytes(entry.byteSize)}</span>

              <button
                type="button"
                onClick={() =>
                  runExport({
                    templateId: entry.templateId,
                    destinationId: entry.destinationId,
                  })
                }
                className={cn(
                  "ml-auto rounded-md px-2 py-0.5 text-[12px] font-medium text-brand",
                  "transition-colors hover:bg-brand-soft",
                )}
              >
                Run again
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
