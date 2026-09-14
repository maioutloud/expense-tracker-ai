"use client";

import { useMemo, useState } from "react";

import { ExpenseFilters } from "@/components/expenses/ExpenseFilters";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DownloadIcon,
  FilterIcon,
  ListIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import {
  EmptyState,
  ErrorState,
  RowSkeleton,
  Skeleton,
} from "@/components/ui/States";
import { useExpenses } from "@/context/ExpenseProvider";
import { useToast } from "@/context/ToastProvider";
import { describeRange, filterExpenses, resolveRange, totalOf } from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { formatCurrency } from "@/lib/format";
import { DEFAULT_FILTERS, type Filters } from "@/lib/types";

export default function ExpensesPage() {
  const { expenses, status, error, openForm, clearAll, loadSampleData } =
    useExpenses();
  const { toast } = useToast();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [confirmClear, setConfirmClear] = useState(false);

  const now = useMemo(() => new Date(), []);

  const visible = useMemo(
    () => filterExpenses(expenses, filters, now),
    [expenses, filters, now],
  );
  const visibleTotal = useMemo(() => totalOf(visible), [visible]);
  const rangeLabel = useMemo(
    () =>
      describeRange(resolveRange(filters.preset, filters.from, filters.to, now)),
    [filters, now],
  );

  const handleExport = () => {
    if (visible.length === 0) {
      toast({
        title: "Nothing to export",
        description: "No expenses match the current filters.",
        variant: "error",
      });
      return;
    }
    downloadCSV(visible);
    toast({
      title: "CSV exported",
      description: `${visible.length} ${visible.length === 1 ? "expense" : "expenses"} written to your downloads.`,
      variant: "success",
    });
  };

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
        <Skeleton className="h-8 w-40" />
        <div className="card overflow-hidden">
          <div className="border-b border-border p-4">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            Expenses
          </h1>
          <p className="mt-0.5 text-sm text-secondary">
            {rangeLabel} ·{" "}
            <span className="font-medium tabular-nums text-primary">
              {formatCurrency(visibleTotal)}
            </span>{" "}
            {filters.preset === "all" &&
            filters.categories.length === 0 &&
            !filters.search.trim()
              ? "total"
              : "matching"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            icon={<DownloadIcon width={16} height={16} />}
            disabled={expenses.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmClear(true)}
            icon={<TrashIcon width={16} height={16} />}
            disabled={expenses.length === 0}
            className="hover:text-danger"
          >
            Clear all
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openForm()}
            icon={<PlusIcon width={16} height={16} />}
          >
            Add expense
          </Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {expenses.length === 0 ? (
          <EmptyState
            icon={<ListIcon width={22} height={22} />}
            title="No expenses yet"
            description="Log your first expense, or load a sample data set to try out the filters, charts, and export."
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
        ) : (
          <>
            <ExpenseFilters
              filters={filters}
              onChange={setFilters}
              matchCount={visible.length}
              totalCount={expenses.length}
            />

            {visible.length === 0 ? (
              <EmptyState
                icon={<FilterIcon width={20} height={20} />}
                title="No matches"
                description="Nothing fits the current filters. Try a wider date range or clear the category selection."
                action={
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })
                    }
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <ExpenseList expenses={visible} sort={filters.sort} />
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear all expenses?"
        description={`This removes all ${expenses.length} ${expenses.length === 1 ? "expense" : "expenses"} from this browser.`}
        confirmLabel="Clear everything"
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAll();
          setFilters(DEFAULT_FILTERS);
          setConfirmClear(false);
        }}
      >
        <p className="text-sm text-secondary">
          You&apos;ll get one chance to undo this from the notification. Export a
          CSV first if you want a copy.
        </p>
      </ConfirmDialog>
    </div>
  );
}
