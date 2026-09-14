"use client";

import type { ReactNode } from "react";

import { Sparkline } from "@/components/charts/Sparkline";
import { TrendDownIcon, TrendUpIcon } from "@/components/ui/Icons";
import type { DashboardStats } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { formatCurrency, formatPercent, formatMonthKey } from "@/lib/format";
import { monthKeyOf } from "@/lib/date";

/**
 * Month-over-month change. For spending, up is bad — so the direction and the
 * sentiment are separate, and both an icon and a label carry the meaning so it
 * never rests on color alone.
 */
function Delta({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-[13px] text-muted">No prior month to compare</span>
    );
  }

  const up = value > 0;
  const flat = Math.abs(value) < 0.005;

  if (flat) {
    return (
      <span className="text-[13px] text-secondary">Flat vs last month</span>
    );
  }

  const Icon = up ? TrendUpIcon : TrendDownIcon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[13px] font-medium",
        up ? "text-danger" : "text-good",
      )}
    >
      <Icon width={15} height={15} aria-hidden="true" />
      <span className="tabular-nums">{formatPercent(Math.abs(value))}</span>
      <span className="font-normal text-secondary">
        {up ? "more than" : "less than"} last month
      </span>
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: ReactNode;
  className?: string;
}

function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <div className={cn("card p-5", className)}>
      <p className="text-[13px] font-medium text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
      {hint && <div className="mt-2 text-[13px] text-secondary">{hint}</div>}
    </div>
  );
}

interface StatCardsProps {
  stats: DashboardStats;
  /** Cumulative month-to-date spend, one point per day. */
  sparkline: number[];
}

export function StatCards({ stats, sparkline }: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Hero tile — the one number the dashboard leads with. */}
      <div className="card flex flex-col p-5 sm:col-span-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-secondary">
              Spent in {formatMonthKey(monthKeyOf(new Date()))}
            </p>
            <p className="mt-1.5 text-[44px] font-semibold leading-none tracking-tight text-primary">
              {formatCurrency(stats.thisMonth)}
            </p>
            <div className="mt-2.5">
              <Delta value={stats.monthDelta} />
            </div>
          </div>

          {stats.topCategory && (
            <div className="hidden shrink-0 text-right sm:block">
              <p className="text-[12px] text-muted">Top category</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: stats.topCategory.color }}
                />
                {stats.topCategory.label}
              </p>
              <p className="text-[12px] tabular-nums text-secondary">
                {formatCurrency(stats.topCategory.total)} ·{" "}
                {formatPercent(stats.topCategory.share)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4">
          <Sparkline
            values={sparkline}
            height={44}
            label="Cumulative spending this month"
          />
        </div>
      </div>

      <StatCard
        label="All-time total"
        value={formatCurrency(stats.total)}
        hint={
          <>
            Across{" "}
            <span className="font-medium tabular-nums text-primary">
              {stats.count}
            </span>{" "}
            {stats.count === 1 ? "expense" : "expenses"}
          </>
        }
      />

      <StatCard
        label="Average per day"
        value={formatCurrency(stats.dailyAverage)}
        hint={
          <>
            Month to date ·{" "}
            <span className="font-medium tabular-nums text-primary">
              {stats.thisMonthCount}
            </span>{" "}
            {stats.thisMonthCount === 1 ? "expense" : "expenses"}
          </>
        }
      />
    </div>
  );
}
