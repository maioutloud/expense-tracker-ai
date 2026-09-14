import { isCategoryId } from "./categories";
import { isValidISODate } from "./date";
import { roundMoney } from "./money";
import type { Expense } from "./types";

const STORAGE_KEY = "expense-tracker:expenses:v1";
export const THEME_KEY = "expense-tracker:theme:v1";

export class StorageUnavailableError extends Error {}
export class StorageFullError extends Error {}

function getLocalStorage(): Storage {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new StorageUnavailableError("localStorage is not available.");
  }
  return window.localStorage;
}

/** Narrows an unknown parsed value to a well-formed Expense, or null. */
function parseExpense(value: unknown): Expense | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.amount !== "number" || !Number.isFinite(raw.amount)) {
    return null;
  }
  if (raw.amount <= 0) return null;
  if (!isCategoryId(raw.category)) return null;
  if (typeof raw.date !== "string" || !isValidISODate(raw.date)) return null;
  if (typeof raw.description !== "string") return null;

  const now = new Date().toISOString();
  return {
    id: raw.id,
    amount: roundMoney(raw.amount),
    category: raw.category,
    date: raw.date,
    description: raw.description,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
  };
}

/**
 * Reads the stored expenses. Malformed individual records are dropped rather than
 * failing the whole load, so one bad row can never lock a user out of their data.
 */
export function loadExpenses(): Expense[] {
  const raw = getLocalStorage().getItem(STORAGE_KEY);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Saved data is corrupted and could not be read.");
  }

  if (!Array.isArray(parsed)) return [];

  const expenses: Expense[] = [];
  for (const item of parsed) {
    const expense = parseExpense(item);
    if (expense) expenses.push(expense);
  }
  return expenses;
}

export function saveExpenses(expenses: Expense[]): void {
  try {
    getLocalStorage().setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      throw new StorageFullError(
        "Browser storage is full — remove some expenses and try again.",
      );
    }
    throw error;
  }
}

export function clearStoredExpenses(): void {
  getLocalStorage().removeItem(STORAGE_KEY);
}

/** `crypto.randomUUID` needs a secure context; the fallback keeps http://LAN working. */
export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
