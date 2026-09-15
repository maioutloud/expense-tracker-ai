"use client";

import { useState } from "react";

import { DestinationsPanel } from "./DestinationsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { SchedulePanel } from "./SchedulePanel";
import { SharePanel } from "./SharePanel";
import { TemplatesPanel } from "./TemplatesPanel";
import { Drawer } from "@/components/ui/Drawer";
import {
  CheckCircleIcon,
  ClockIcon,
  CloseIcon,
  HistoryIcon,
  LayersIcon,
  LinkIcon,
  CloudIcon,
} from "@/components/ui/Icons";
import { useCloudExport } from "@/context/CloudExportProvider";
import { cn } from "@/lib/cn";
import type { DestinationId, TemplateId } from "@/lib/cloud/types";

type Tab = "templates" | "connect" | "share" | "schedule" | "history";

const TABS: { id: Tab; label: string; Icon: typeof LayersIcon }[] = [
  { id: "templates", label: "Reports", Icon: LayersIcon },
  { id: "connect", label: "Connect", Icon: CloudIcon },
  { id: "share", label: "Share", Icon: LinkIcon },
  { id: "schedule", label: "Schedule", Icon: ClockIcon },
  { id: "history", label: "History", Icon: HistoryIcon },
];

interface ExportHubProps {
  open: boolean;
  onClose: () => void;
}

export function ExportHub({ open, onClose }: ExportHubProps) {
  const [tab, setTab] = useState<Tab>("templates");
  const [templateId, setTemplateId] = useState<TemplateId>("monthly-summary");
  const [destinationId, setDestinationId] = useState<DestinationId>("download");

  const { jobs, history, connections, dismissJob } = useCloudExport();

  const activeJobs = jobs.filter(
    (job) => job.state === "running" || job.state === "queued",
  );
  const connectedCount = Object.values(connections).filter(
    (record) => record?.state === "connected",
  ).length;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Export & sharing"
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
          <span>
            {connectedCount > 0
              ? `${connectedCount} ${connectedCount === 1 ? "service" : "services"} connected`
              : "No services connected"}
          </span>
          {history.length > 0 && (
            <>
              <span className="text-muted">·</span>
              <span className="text-muted">
                {history.length} {history.length === 1 ? "export" : "exports"} logged
              </span>
            </>
          )}
        </span>
      }
      toolbar={
        <div
          role="tablist"
          aria-label="Export sections"
          className="-mb-px flex gap-1 overflow-x-auto"
        >
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "border-brand text-primary"
                    : "border-transparent text-secondary hover:text-primary",
                )}
              >
                <Icon width={15} height={15} />
                {label}
              </button>
            );
          })}
        </div>
      }
      footer={
        activeJobs.length > 0 ? (
          <ul className="space-y-2">
            {activeJobs.map((job) => (
              <li key={job.id}>
                <div className="flex items-center gap-2 text-[12.5px]">
                  <span className="font-medium text-primary">
                    {job.templateName}
                  </span>
                  <span className="text-muted">→</span>
                  <span className="text-secondary">{job.destinationName}</span>
                  {job.simulated && (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                      Simulated
                    </span>
                  )}
                  <span className="ml-auto tabular-nums text-muted">
                    {Math.round(job.progress * 100)}%
                  </span>
                </div>

                <div
                  className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2"
                  role="progressbar"
                  aria-valuenow={Math.round(job.progress * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${job.templateName} to ${job.destinationName}`}
                >
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-300"
                    style={{ width: `${Math.max(job.progress * 100, 4)}%` }}
                  />
                </div>

                <p className="mt-1 text-[12px] text-muted">{job.step}</p>
              </li>
            ))}
          </ul>
        ) : (
          <JobSummary onDismiss={dismissJob} />
        )
      }
    >
      {tab === "templates" && (
        <TemplatesPanel
          templateId={templateId}
          onTemplateChange={setTemplateId}
          destinationId={destinationId}
          onDestinationChange={setDestinationId}
        />
      )}
      {tab === "connect" && <DestinationsPanel />}
      {tab === "share" && <SharePanel />}
      {tab === "schedule" && <SchedulePanel />}
      {tab === "history" && <HistoryPanel />}
    </Drawer>
  );
}

/** Shows the most recent finished job so a completed transfer doesn't vanish. */
function JobSummary({ onDismiss }: { onDismiss: (id: string) => void }) {
  const { jobs } = useCloudExport();
  const latest = jobs.find(
    (job) => job.state === "succeeded" || job.state === "failed",
  );

  if (!latest) {
    return (
      <p className="text-[12.5px] text-muted">
        Only <span className="font-medium text-secondary">Download</span> moves
        real data. Every other destination runs a simulated flow.
      </p>
    );
  }

  const failed = latest.state === "failed";

  return (
    <div className="flex items-start gap-2.5">
      {failed ? (
        <CloseIcon width={16} height={16} className="mt-0.5 shrink-0 text-danger" />
      ) : (
        <CheckCircleIcon
          width={16}
          height={16}
          className="mt-0.5 shrink-0 text-good"
        />
      )}
      <div className="min-w-0 flex-1 text-[12.5px]">
        <p className="font-medium text-primary">
          {latest.templateName} → {latest.destinationName}
        </p>
        <p className="text-muted">{latest.error ?? latest.step}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(latest.id)}
        className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-primary"
        aria-label="Dismiss"
      >
        <CloseIcon width={14} height={14} />
      </button>
    </div>
  );
}
