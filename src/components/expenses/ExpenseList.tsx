"use client";

import { useMemo } from "react";

import { useExpenses } from "@/context/ExpenseProvider";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { sumAmounts } from "@/lib/money";
import type { Expense, SortKey } from "@/lib/types";
import { IconButton } from "@/components/ui/Button";
import { CategoryChip } from "@/components/ui/CategoryIcon";
import { PencilIcon, TrashIcon } from "@/components/ui/Icons";

interface ExpenseListProps {
  expenses: Expense[];
  sort: SortKey;
}

interface DayGroup {
  date: string;
  items: Expense[];
  total: number;
}

export function ExpenseList({ expenses, sort }: ExpenseListProps) {
  // Day headers only make sense while the list is in date order.
  const grouped = sort === "date-desc" || sort === "date-asc";

  const groups = useMemo<DayGroup[]>(() => {
    if (!grouped) return [];
    const map = new Map<string, Expense[]>();
    for (const expense of expenses) {
      const bucket = map.get(expense.date);
      if (bucket) bucket.push(expense);
      else map.set(expense.date, [expense]);
    }
    return [...map.entries()].map(([date, items]) => ({
      date,
      items,
      total: sumAmounts(items.map((item) => item.amount)),
    }));
  }, [expenses, grouped]);

  if (!grouped) {
    return (
      <ul className="divide-y divide-border">
        {expenses.map((expense) => (
          <ExpenseRow key={expense.id} expense={expense} />
        ))}
      </ul>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <section key={group.date}>
          <div className="flex items-baseline justify-between gap-3 border-b border-border bg-surface-2 px-4 py-1.5">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-secondary">
              {formatRelativeDate(group.date)}
            </h3>
            <span className="text-[12px] tabular-nums text-muted">
              {formatCurrency(group.total)}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {group.items.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const { openForm, deleteExpense } = useExpenses();
  const meta = CATEGORIES[expense.category];

  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 sm:gap-4">
      <CategoryChip category={expense.category} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">
          {expense.description}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-secondary">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          <span className="truncate">{meta.label}</span>
          <span className="text-muted">·</span>
          <span className="shrink-0 tabular-nums text-muted">
            {formatRelativeDate(expense.date)}
          </span>
        </p>
      </div>

      <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
        {formatCurrency(expense.amount)}
      </p>

      {/* Actions stay visible on touch devices, where there is no hover. */}
      <div
        className={cn(
          "flex shrink-0 gap-0.5 transition-opacity",
          "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
        )}
      >
        <IconButton
          label={`Edit ${expense.description}`}
          variant="ghost"
          size="sm"
          onClick={() => openForm(expense)}
          icon={<PencilIcon width={16} height={16} />}
        />
        <IconButton
          label={`Delete ${expense.description}`}
          variant="ghost"
          size="sm"
          onClick={() => deleteExpense(expense.id)}
          icon={<TrashIcon width={16} height={16} />}
          className="hover:text-danger"
        />
      </div>
    </li>
  );
}
