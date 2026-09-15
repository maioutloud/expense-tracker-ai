"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { AlertIcon, ClockIcon } from "@/components/ui/Icons";
import { useCloudExport } from "@/context/CloudExportProvider";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import {
  CADENCE_LABELS,
  WEEKDAYS,
  describeCountdown,
  describeSchedule,
  nextRun,
} from "@/lib/cloud/schedule";
import { TEMPLATES } from "@/lib/cloud/templates";
import type { Cadence, DestinationId, TemplateId } from "@/lib/cloud/types";
import { cn } from "@/lib/cn";

const CADENCES: Cadence[] = ["off", "daily", "weekly", "monthly"];

export function SchedulePanel() {
  const { schedule, updateSchedule } = useCloudExport();
  const now = useMemo(() => new Date(), []);

  const next = nextRun(schedule, now);
  const active = schedule.cadence !== "off";

  const patch = (partial: Partial<typeof schedule>) =>
    updateSchedule({ ...schedule, ...partial });

  return (
    <div className="space-y-5">
      {/* The disclosure has to lead here: a backup people believe is running,
          but isn't, is how data gets lost. */}
      <div className="rounded-xl border border-warning bg-surface-2 p-4">
        <div className="flex items-start gap-2.5">
          <AlertIcon
            width={17}
            height={17}
            className="mt-0.5 shrink-0 text-warning"
          />
          <div className="text-[12.5px] leading-relaxed text-secondary">
            <p className="font-medium text-primary">
              Nothing here runs on its own.
            </p>
            <p className="mt-1">
              This app is a web page with no server behind it, so when the tab is
              closed there is no process left alive to run anything. Your
              preference is saved and the next-run time below is real arithmetic,
              but treat this as a mockup of the flow — not as a backup that is
              actually happening.
            </p>
          </div>
        </div>
      </div>

      <section>
        <h3 className="label">How often</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CADENCES.map((cadence) => (
            <button
              key={cadence}
              type="button"
              onClick={() => patch({ cadence })}
              aria-pressed={schedule.cadence === cadence}
              className={cn(
                "rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-all",
                schedule.cadence === cadence
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border text-secondary hover:border-border-strong hover:bg-surface-2",
              )}
            >
              {CADENCE_LABELS[cadence]}
            </button>
          ))}
        </div>
      </section>

      {active && (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            {schedule.cadence === "weekly" && (
              <div>
                <label htmlFor="sched-weekday" className="label">
                  Day of the week
                </label>
                <select
                  id="sched-weekday"
                  value={schedule.weekday}
                  onChange={(event) =>
                    patch({ weekday: Number(event.target.value) })
                  }
                  className="field cursor-pointer"
                >
                  {WEEKDAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {schedule.cadence === "monthly" && (
              <div>
                <label htmlFor="sched-day" className="label">
                  Day of the month
                </label>
                <select
                  id="sched-day"
                  value={schedule.dayOfMonth}
                  onChange={(event) =>
                    patch({ dayOfMonth: Number(event.target.value) })
                  }
                  className="field cursor-pointer"
                >
                  {/* Capped at 28 so the date exists in February too. */}
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="sched-time" className="label">
                Time
              </label>
              <input
                id="sched-time"
                type="time"
                value={schedule.time}
                onChange={(event) => patch({ time: event.target.value })}
                className="field"
              />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sched-template" className="label">
                Report
              </label>
              <select
                id="sched-template"
                value={schedule.templateId}
                onChange={(event) =>
                  patch({ templateId: event.target.value as TemplateId })
                }
                className="field cursor-pointer"
              >
                {TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sched-destination" className="label">
                Deliver to
              </label>
              <select
                id="sched-destination"
                value={schedule.destinationId}
                onChange={(event) =>
                  patch({ destinationId: event.target.value as DestinationId })
                }
                className="field cursor-pointer"
              >
                {DESTINATIONS.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                    {destination.real ? "" : " (simulated)"}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="rounded-xl border border-border p-4">
            <div className="flex items-start gap-2.5">
              <ClockIcon
                width={17}
                height={17}
                className="mt-0.5 shrink-0 text-brand"
              />
              <div>
                <p className="text-[13px] font-medium text-primary">
                  {describeSchedule(schedule)}
                </p>
                {next && (
                  <p className="mt-0.5 text-[12.5px] text-secondary">
                    Next would run{" "}
                    <span className="font-medium text-primary">
                      {next.toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>{" "}
                    <span className="text-muted">
                      ({describeCountdown(next, now)})
                    </span>
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {!active && (
        <p className="text-[13px] text-secondary">
          Pick a cadence to see what an automatic export would look like.
        </p>
      )}

      {active && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => patch({ cadence: "off" })}
        >
          Turn off scheduling
        </Button>
      )}
    </div>
  );
}
