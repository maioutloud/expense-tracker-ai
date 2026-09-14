import { addDays, toISODate } from "./date";
import { createId } from "./storage";
import type { CategoryId, Expense } from "./types";

interface Template {
  description: string;
  category: CategoryId;
  min: number;
  max: number;
  /** Rough relative frequency. */
  weight: number;
}

const TEMPLATES: Template[] = [
  { description: "Grocery run", category: "food", min: 38, max: 124, weight: 9 },
  { description: "Coffee", category: "food", min: 3.5, max: 7.25, weight: 12 },
  { description: "Lunch with the team", category: "food", min: 14, max: 32, weight: 6 },
  { description: "Dinner out", category: "food", min: 28, max: 96, weight: 4 },
  { description: "Gas fill-up", category: "transportation", min: 32, max: 68, weight: 5 },
  { description: "Transit pass", category: "transportation", min: 2.75, max: 12, weight: 6 },
  { description: "Rideshare home", category: "transportation", min: 11, max: 38, weight: 4 },
  { description: "Parking garage", category: "transportation", min: 6, max: 24, weight: 3 },
  { description: "Streaming subscription", category: "entertainment", min: 9.99, max: 22.99, weight: 4 },
  { description: "Concert tickets", category: "entertainment", min: 45, max: 180, weight: 1 },
  { description: "Movie night", category: "entertainment", min: 16, max: 42, weight: 3 },
  { description: "Bookstore", category: "entertainment", min: 12, max: 48, weight: 2 },
  { description: "New running shoes", category: "shopping", min: 64, max: 160, weight: 2 },
  { description: "Household supplies", category: "shopping", min: 18, max: 72, weight: 4 },
  { description: "Phone case", category: "shopping", min: 15, max: 45, weight: 2 },
  { description: "Winter jacket", category: "shopping", min: 90, max: 240, weight: 1 },
  { description: "Electricity bill", category: "bills", min: 68, max: 165, weight: 3 },
  { description: "Internet", category: "bills", min: 55, max: 89, weight: 3 },
  { description: "Phone plan", category: "bills", min: 35, max: 75, weight: 3 },
  { description: "Renters insurance", category: "bills", min: 18, max: 34, weight: 2 },
  { description: "Gift for a friend", category: "other", min: 20, max: 85, weight: 2 },
  { description: "Pharmacy", category: "other", min: 8, max: 44, weight: 3 },
  { description: "Haircut", category: "other", min: 25, max: 60, weight: 2 },
];

/** Mulberry32 - a tiny seeded PRNG, so the sample set is the same every time. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a realistic 5-month history so every chart, filter, and summary has
 * something to show on a fresh install.
 */
export function createSampleExpenses(now: Date = new Date()): Expense[] {
  const random = seededRandom(20260914);
  const weighted = TEMPLATES.flatMap((template) =>
    Array<Template>(template.weight).fill(template),
  );

  const expenses: Expense[] = [];
  const spanDays = 150;

  for (let dayOffset = spanDays; dayOffset >= 0; dayOffset -= 1) {
    // 0-3 expenses a day, weighted toward 1-2.
    const roll = random();
    const count = roll < 0.18 ? 0 : roll < 0.62 ? 1 : roll < 0.9 ? 2 : 3;

    for (let i = 0; i < count; i += 1) {
      const template = weighted[Math.floor(random() * weighted.length)];
      const amount =
        Math.round(
          (template.min + random() * (template.max - template.min)) * 100,
        ) / 100;
      const date = toISODate(addDays(now, -dayOffset));
      const createdAt = new Date(
        `${date}T${String(8 + Math.floor(random() * 12)).padStart(2, "0")}:${String(
          Math.floor(random() * 60),
        ).padStart(2, "0")}:00`,
      ).toISOString();

      expenses.push({
        id: createId(),
        amount,
        category: template.category,
        date,
        description: template.description,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  return expenses;
}
