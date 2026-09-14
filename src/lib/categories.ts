import type { CategoryId } from "./types";
import { CATEGORY_IDS } from "./types";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  /** CSS custom property holding this category's validated series color. */
  color: string;
  /** Tint used for icon chips and soft backgrounds. */
  description: string;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  food: {
    id: "food",
    label: "Food",
    color: "var(--cat-food)",
    description: "Groceries, restaurants, coffee",
  },
  transportation: {
    id: "transportation",
    label: "Transportation",
    color: "var(--cat-transportation)",
    description: "Fuel, transit, rideshare, parking",
  },
  entertainment: {
    id: "entertainment",
    label: "Entertainment",
    color: "var(--cat-entertainment)",
    description: "Streaming, events, hobbies",
  },
  shopping: {
    id: "shopping",
    label: "Shopping",
    color: "var(--cat-shopping)",
    description: "Clothing, electronics, home goods",
  },
  bills: {
    id: "bills",
    label: "Bills",
    color: "var(--cat-bills)",
    description: "Rent, utilities, subscriptions",
  },
  other: {
    id: "other",
    label: "Other",
    color: "var(--cat-other)",
    description: "Anything that fits nowhere else",
  },
};

/** Stable display order — also the fixed color-slot order. Never cycle or reorder. */
export const CATEGORY_LIST: CategoryMeta[] = CATEGORY_IDS.map(
  (id) => CATEGORIES[id],
);

export function isCategoryId(value: unknown): value is CategoryId {
  return (
    typeof value === "string" &&
    (CATEGORY_IDS as readonly string[]).includes(value)
  );
}
