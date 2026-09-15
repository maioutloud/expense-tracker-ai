"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { CheckIcon, LinkIcon, PlusIcon } from "@/components/ui/Icons";
import { EmptyState, ErrorState, RowSkeleton, Skeleton } from "@/components/ui/States";
import { useExpenses } from "@/context/ExpenseProvider";
import { useToast } from "@/context/ToastProvider";
import { categoryBreakdown } from "@/lib/analytics";
import { CATEGORIES } from "@/lib/categories";
import { decodeShare, type SharedSnapshot } from "@/lib/cloud/share";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

type State =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; snapshot: SharedSnapshot };

export default function SharedPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [imported, setImported] = useState(false);
  const { addExpense } = useExpenses();
  const { toast } = useToast();

  useEffect(() => {
    // The payload lives in the fragment, which is only readable on the client.
    const token = window.location.hash.replace(/^#/, "");
    if (!token) {
      setState({ status: "empty" });
      return;
    }

    let cancelled = false;
    decodeShare(token)
      .then((snapshot) => {
        if (cancelled) return;
        setState({ status: "ready", snapshot });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "This link couldn't be read.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const breakdown = useMemo(
    () =>
      state.status === "ready"
        ? categoryBreakdown(state.snapshot.expenses)
        : [],
    [state],
  );

  const handleImport = () => {
    if (state.status !== "ready") return;
    for (const expense of state.snapshot.expenses) {
      addExpense({
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        description: expense.description,
      });
    }
    setImported(true);
    toast({
      title: "Added to your tracker",
      description: `${state.snapshot.expenses.length} ${
        state.snapshot.expenses.length === 1 ? "expense" : "expenses"
      } imported.`,
      variant: "success",
    });
  };

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="card divide-y divide-border">
          {Array.from({ length: 4 }).map((_, index) => (
            <RowSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="card">
        <EmptyState
          icon={<LinkIcon width={22} height={22} />}
          title="No shared data in this link"
          description="A share link carries its data after the # in the URL. This one arrived without any, which usually means it was truncated when it was pasted."
          action={
            <Link href="/">
              <Button variant="primary">Go to the dashboard</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <ErrorState
        title="This link couldn't be opened"
        description={state.message}
        action={
          <Link href="/">
            <Button variant="secondary">Go to the dashboard</Button>
          </Link>
        }
      />
    );
  }

  const { snapshot } = state;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[12.5px] font-medium uppercase tracking-wide text-muted">
            <LinkIcon width={14} height={14} />
            Shared with you
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-primary">
            {snapshot.title}
          </h1>
          <p className="mt-0.5 text-sm text-secondary">
            {snapshot.expenses.length}{" "}
            {snapshot.expenses.length === 1 ? "expense" : "expenses"} ·{" "}
            <span className="font-medium tabular-nums text-primary">
              {formatCurrency(snapshot.total)}
            </span>
          </p>
        </div>

        <Button
          variant={imported ? "secondary" : "primary"}
          onClick={handleImport}
          disabled={imported || snapshot.expenses.length === 0}
          icon={
            imported ? (
              <CheckIcon width={16} height={16} />
            ) : (
              <PlusIcon width={16} height={16} />
            )
          }
        >
          {imported ? "Added to your tracker" : "Add to my tracker"}
        </Button>
      </div>

      <div className="card p-4">
        <p className="text-[12.5px] leading-relaxed text-secondary">
          These expenses came from the link itself, not from a server — the data
          was packed into the part of the URL after the{" "}
          <code className="rounded bg-surface-2 px-1">#</code>, which browsers
          never send anywhere. Nothing has been added to your own tracker unless
          you choose to import it.
        </p>
      </div>

      {breakdown.length > 0 && (
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-primary">
            By category
          </h2>
          <ul className="space-y-1.5">
            {breakdown.map((slice) => (
              <li key={slice.id} className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="flex-1 truncate text-[13px] text-secondary">
                  {slice.label}
                </span>
                <span className="text-[13px] font-medium tabular-nums text-primary">
                  {formatCurrency(slice.total)}
                </span>
                <span className="w-9 text-right text-[12px] tabular-nums text-muted">
                  {formatPercent(slice.share)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-border px-4 py-3.5">
          <h2 className="text-sm font-semibold text-primary">Expenses</h2>
        </div>
        <ul className="divide-y divide-border">
          {[...snapshot.expenses]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((expense) => {
              const meta = CATEGORIES[expense.category];
              return (
                <li
                  key={expense.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">
                      {expense.description}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-secondary">
                      {meta.label}
                      <span className="text-muted"> · </span>
                      <span className="tabular-nums text-muted">
                        {formatDate(expense.date)}
                      </span>
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                    {formatCurrency(expense.amount)}
                  </p>
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}
