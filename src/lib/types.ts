export const CATEGORY_IDS = [
  "food",
  "transportation",
  "entertainment",
  "shopping",
  "bills",
  "other",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Expense {
  id: string;
  /** Positive amount in major currency units, rounded to 2 decimals. */
  amount: number;
  category: CategoryId;
  /** Calendar date as `YYYY-MM-DD` (no timezone — it is a date, not an instant). */
  date: string;
  description: string;
  /** ISO-8601 instants for audit/sorting. */
  createdAt: string;
  updatedAt: string;
}

/** The shape the form collects, before an id and timestamps are assigned. */
export type ExpenseDraft = Pick<
  Expense,
  "amount" | "category" | "date" | "description"
>;

export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export type DateRangePreset =
  | "all"
  | "this-month"
  | "last-month"
  | "last-7"
  | "last-30"
  | "last-90"
  | "this-year"
  | "custom";

export interface Filters {
  search: string;
  categories: CategoryId[];
  preset: DateRangePreset;
  /** Only meaningful when `preset` is `custom`. `YYYY-MM-DD`. */
  from: string;
  to: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  search: "",
  categories: [],
  preset: "all",
  from: "",
  to: "",
  sort: "date-desc",
};
