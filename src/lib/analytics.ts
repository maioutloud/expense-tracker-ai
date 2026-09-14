import { CATEGORIES, CATEGORY_LIST } from "./categories";
import {
  addDays,
  addMonths,
  daysBetween,
  endOfMonth,
  monthKey,
  monthKeyOf,
  parseISODate,
  startOfMonth,
  toISODate,
} from "./date";
import { sumAmounts } from "./money";
import type {
  CategoryId,
  DateRangePreset,
  Expense,
  Filters,
  SortKey,
} from "./types";

export interface ResolvedRange {
  from: string | null;
  to: string | null;
}

/** Turns a preset (or a custom pair) into concrete inclusive ISO bounds. */
export function resolveRange(
  preset: DateRangePreset,
  customFrom: string,
  customTo: string,
  now: Date = new Date(),
): ResolvedRange {
  switch (preset) {
    case "this-month":
      return {
        from: toISODate(startOfMonth(now)),
        to: toISODate(endOfMonth(now)),
      };
    case "last-month": {
      const prev = addMonths(startOfMonth(now), -1);
      return { from: toISODate(prev), to: toISODate(endOfMonth(prev)) };
    }
    case "last-7":
      return { from: toISODate(addDays(now, -6)), to: toISODate(now) };
    case "last-30":
      return { from: toISODate(addDays(now, -29)), to: toISODate(now) };
    case "last-90":
      return { from: toISODate(addDays(now, -89)), to: toISODate(now) };
    case "this-year":
      return {
        from: toISODate(new Date(now.getFullYear(), 0, 1)),
        to: toISODate(new Date(now.getFullYear(), 11, 31)),
      };
    case "custom":
      return { from: customFrom || null, to: customTo || null };
    case "all":
    default:
      return { from: null, to: null };
  }
}

export const SORT_LABELS: Record<SortKey, string> = {
  "date-desc": "Newest first",
  "date-asc": "Oldest first",
  "amount-desc": "Highest amount",
  "amount-asc": "Lowest amount",
};

function compare(a: Expense, b: Expense, sort: SortKey): number {
  switch (sort) {
    case "date-asc":
      return (
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
      );
    case "amount-desc":
      return b.amount - a.amount || b.date.localeCompare(a.date);
    case "amount-asc":
      return a.amount - b.amount || b.date.localeCompare(a.date);
    case "date-desc":
    default:
      return (
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
      );
  }
}

/** Applies search, category, and date filters, then sorts. Pure - never mutates input. */
export function filterExpenses(
  expenses: Expense[],
  filters: Filters,
  now: Date = new Date(),
): Expense[] {
  const { from, to } = resolveRange(
    filters.preset,
    filters.from,
    filters.to,
    now,
  );
  const query = filters.search.trim().toLowerCase();
  const categorySet =
    filters.categories.length > 0 ? new Set(filters.categories) : null;

  const result = expenses.filter((expense) => {
    if (categorySet && !categorySet.has(expense.category)) return false;
    // ISO dates sort lexicographically, so a string compare is a date compare.
    if (from && expense.date < from) return false;
    if (to && expense.date > to) return false;
    if (query) {
      const haystack = `${expense.description} ${CATEGORIES[expense.category].label}`;
      if (!haystack.toLowerCase().includes(query)) return false;
    }
    return true;
  });

  return result.sort((a, b) => compare(a, b, filters.sort));
}

export function totalOf(expenses: Expense[]): number {
  return sumAmounts(expenses.map((expense) => expense.amount));
}

export interface CategorySlice {
  id: CategoryId;
  label: string;
  color: string;
  total: number;
  count: number;
  /** Share of the set's total, 0 to 1. */
  share: number;
}

/** Totals per category, largest first. Categories with no spend are omitted. */
export function categoryBreakdown(expenses: Expense[]): CategorySlice[] {
  const totals = new Map<CategoryId, { cents: number; count: number }>();
  for (const expense of expenses) {
    const entry = totals.get(expense.category) ?? { cents: 0, count: 0 };
    entry.cents += Math.round(expense.amount * 100);
    entry.count += 1;
    totals.set(expense.category, entry);
  }

  const grand = totalOf(expenses);

  return CATEGORY_LIST.filter((meta) => totals.has(meta.id))
    .map((meta) => {
      const entry = totals.get(meta.id)!;
      const total = entry.cents / 100;
      return {
        id: meta.id,
        label: meta.label,
        color: meta.color,
        total,
        count: entry.count,
        share: grand > 0 ? total / grand : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export interface MonthPoint {
  key: string;
  total: number;
  count: number;
}

/** Totals for the last `months` calendar months, including months with no spend. */
export function monthlyTotals(
  expenses: Expense[],
  months = 6,
  now: Date = new Date(),
): MonthPoint[] {
  const buckets = new Map<string, { cents: number; count: number }>();
  for (let i = months - 1; i >= 0; i -= 1) {
    buckets.set(monthKeyOf(addMonths(startOfMonth(now), -i)), {
      cents: 0,
      count: 0,
    });
  }

  for (const expense of expenses) {
    const bucket = buckets.get(monthKey(expense.date));
    if (bucket) {
      bucket.cents += Math.round(expense.amount * 100);
      bucket.count += 1;
    }
  }

  return [...buckets.entries()].map(([key, value]) => ({
    key,
    total: value.cents / 100,
    count: value.count,
  }));
}

export interface DashboardStats {
  total: number;
  count: number;
  thisMonth: number;
  thisMonthCount: number;
  lastMonth: number;
  /** Fractional month-over-month change, or null when there is no prior baseline. */
  monthDelta: number | null;
  dailyAverage: number;
  largest: Expense | null;
  topCategory: CategorySlice | null;
}

export function dashboardStats(
  expenses: Expense[],
  now: Date = new Date(),
): DashboardStats {
  const thisKey = monthKeyOf(now);
  const lastKey = monthKeyOf(addMonths(startOfMonth(now), -1));

  const thisMonthExpenses = expenses.filter(
    (expense) => monthKey(expense.date) === thisKey,
  );
  const lastMonthExpenses = expenses.filter(
    (expense) => monthKey(expense.date) === lastKey,
  );

  const thisMonth = totalOf(thisMonthExpenses);
  const lastMonth = totalOf(lastMonthExpenses);

  // Month-to-date average uses elapsed days, not the full month length.
  const elapsedDays = daysBetween(startOfMonth(now), now);
  const dailyAverage = elapsedDays > 0 ? thisMonth / elapsedDays : 0;

  const largest = expenses.reduce<Expense | null>(
    (max, expense) => (!max || expense.amount > max.amount ? expense : max),
    null,
  );

  const breakdown = categoryBreakdown(thisMonthExpenses);

  return {
    total: totalOf(expenses),
    count: expenses.length,
    thisMonth,
    thisMonthCount: thisMonthExpenses.length,
    lastMonth,
    monthDelta: lastMonth > 0 ? (thisMonth - lastMonth) / lastMonth : null,
    dailyAverage,
    largest,
    topCategory: breakdown[0] ?? null,
  };
}

/** Daily totals across a trailing window - the sparkline series for the MTD tile. */
export function dailyTotals(
  expenses: Expense[],
  days = 30,
  now: Date = new Date(),
): { date: string; total: number }[] {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    buckets.set(toISODate(addDays(now, -i)), 0);
  }
  for (const expense of expenses) {
    const current = buckets.get(expense.date);
    if (current !== undefined) {
      buckets.set(expense.date, current + Math.round(expense.amount * 100));
    }
  }
  return [...buckets.entries()].map(([date, cents]) => ({
    date,
    total: cents / 100,
  }));
}

export function describeRange(range: ResolvedRange): string {
  if (!range.from && !range.to) return "All time";
  const from = range.from ? parseISODate(range.from) : null;
  const to = range.to ? parseISODate(range.to) : null;
  const fmt = (date: Date) =>
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  if (from && to) return `${fmt(from)} to ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Through ${fmt(to)}`;
  return "All time";
}
