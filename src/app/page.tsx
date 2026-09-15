"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { DonutChart } from "@/components/charts/DonutChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { StatCards } from "@/components/dashboard/StatCards";
import { ExportDialog } from "@/components/export/ExportDialog";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { Button } from "@/components/ui/Button";
import {
  DownloadIcon,
  ListIcon,
  PlusIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui/States";
import { useExpenses } from "@/context/ExpenseProvider";
import {
  categoryBreakdown,
  dailyTotals,
  dashboardStats,
  monthlyTotals,
  totalOf,
} from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { monthKey, monthKeyOf, startOfMonth, daysBetween } from "@/lib/date";
import { formatMonthKey } from "@/lib/format";

type Scope = "month" | "all";

export default function DashboardPage() {
  const { expenses, status, error, openForm, loadSampleData } = useExpenses();
  const [scope, setScope] = useState<Scope>("month");
  const [exportOpen, setExportOpen] = useState(false);

  const now = useMemo(() => new Date(), []);

  const stats = useMemo(() => dashboardStats(expenses, now), [expenses, now]);
  const trend = useMemo(() => monthlyTotals(expenses, 6, now), [expenses, now]);

  const scoped = useMemo(() => {
    if (scope === "all") return expenses;
    const key = monthKeyOf(now);
    return expenses.filter((expense) => monthKey(expense.date) === key);
  }, [expenses, scope, now]);

  const breakdown = useMemo(() => categoryBreakdown(scoped), [scoped]);
  const scopedTotal = useMemo(() => totalOf(scoped), [scoped]);

  /** Cumulative month-to-date spend, one point per elapsed day. */
  const sparkline = useMemo(() => {
    const elapsed = daysBetween(startOfMonth(now), now);
    const daily = dailyTotals(expenses, elapsed, now);
    let running = 0;
    return daily.map((point) => {
      running += point.total;
      return running;
    });
  }, [expenses, now]);

  const recent = useMemo(
    () =>
      [...expenses]
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt),
        )
        .slice(0, 6),
    [expenses],
  );

  if (status === "error") {
    return (
      <ErrorState
        title="Couldn't load your expenses"
        description={error ?? undefined}
        action={
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload the page
          </Button>
        }
      />
    );
  }

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton className="sm:col-span-2 h-[188px]" />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <CardSkeleton className="h-[320px]" />
          <CardSkeleton className="h-[320px]" />
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="card mt-4">
        <EmptyState
          icon={<ListIcon width={22} height={22} />}
          title="No expenses yet"
          description="Add your first expense to start seeing totals, category breakdowns, and monthly trends. Or load a sample month to explore the app first."
          action={
            <>
              <Button
                variant="primary"
                onClick={() => openForm()}
                icon={<PlusIcon width={16} height={16} />}
              >
                Add your first expense
              </Button>
              <Button
                variant="secondary"
                onClick={loadSampleData}
                icon={<SparklesIcon width={16} height={16} />}
              >
                Load sample data
              </Button>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-secondary">
            Where your money went, at a glance.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExportOpen(true)}
          icon={<DownloadIcon width={16} height={16} />}
        >
          Export
        </Button>
      </div>

      <StatCards stats={stats} sparkline={sparkline} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category breakdown */}
        <section className="card p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-primary">
                Spending by category
              </h2>
              <p className="mt-0.5 text-[13px] text-secondary">
                {scope === "month"
                  ? formatMonthKey(monthKeyOf(now))
                  : "All time"}
              </p>
            </div>

            <div
              className="flex rounded-lg bg-surface-2 p-0.5"
              role="group"
              aria-label="Breakdown period"
            >
              {(
                [
                  { value: "month", label: "This month" },
                  { value: "all", label: "All time" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setScope(option.value)}
                  aria-pressed={scope === option.value}
                  className={cn(
                    "rounded-[7px] px-2.5 py-1 text-[12.5px] font-medium transition-all",
                    scope === option.value
                      ? "bg-surface text-primary shadow-card"
                      : "text-secondary hover:text-primary",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {breakdown.length === 0 ? (
            <EmptyState
              title="Nothing logged this month"
              description="Add an expense and the breakdown will fill in."
              className="py-10"
            />
          ) : (
            <DonutChart
              slices={breakdown}
              total={scopedTotal}
              caption={`${scoped.length} ${scoped.length === 1 ? "expense" : "expenses"}`}
            />
          )}
        </section>

        {/* Monthly trend */}
        <section className="card p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-primary">
              Monthly spending
            </h2>
            <p className="mt-0.5 text-[13px] text-secondary">
              The last six months
            </p>
          </div>
          <TrendChart data={trend} />
        </section>
      </div>

      {/* Recent activity */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
          <h2 className="text-sm font-semibold text-primary">Recent expenses</h2>
          <Link
            href="/expenses"
            className="text-[13px] font-medium text-brand transition-opacity hover:opacity-80"
          >
            View all
          </Link>
        </div>
        <ExpenseList expenses={recent} sort="date-desc" />
      </section>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        expenses={expenses}
      />
    </div>
  );
}
