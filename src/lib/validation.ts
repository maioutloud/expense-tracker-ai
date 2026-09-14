import { isCategoryId } from "./categories";
import { isValidISODate, today } from "./date";
import { roundMoney } from "./money";
import type { ExpenseDraft } from "./types";

export interface ExpenseFormValues {
  amount: string;
  category: string;
  date: string;
  description: string;
}

export type ExpenseFormField = keyof ExpenseFormValues;
export type FieldErrors = Partial<Record<ExpenseFormField, string>>;

export const MAX_AMOUNT = 1_000_000_000;
export const MAX_DESCRIPTION = 120;

export interface ValidationResult {
  errors: FieldErrors;
  /** Present only when there are no errors. */
  draft: ExpenseDraft | null;
}

export function validateExpenseForm(
  values: ExpenseFormValues,
): ValidationResult {
  const errors: FieldErrors = {};

  // --- amount ---------------------------------------------------------
  const rawAmount = values.amount.trim().replace(/[$,\s]/g, "");
  let amount = NaN;
  if (!rawAmount) {
    errors.amount = "Enter an amount.";
  } else if (!/^\d*\.?\d*$/.test(rawAmount)) {
    errors.amount = "Use digits only, e.g. 24.99";
  } else {
    amount = Number(rawAmount);
    if (!Number.isFinite(amount)) {
      errors.amount = "That isn't a valid number.";
    } else if (amount <= 0) {
      errors.amount = "Amount must be greater than zero.";
    } else if (amount > MAX_AMOUNT) {
      errors.amount = "That amount is unrealistically large.";
    } else if (/\.\d{3,}$/.test(rawAmount)) {
      errors.amount = "Amounts are limited to 2 decimal places.";
    }
  }

  // --- category -------------------------------------------------------
  if (!values.category) {
    errors.category = "Pick a category.";
  } else if (!isCategoryId(values.category)) {
    errors.category = "That category isn't recognized.";
  }

  // --- date -----------------------------------------------------------
  const date = values.date.trim();
  if (!date) {
    errors.date = "Pick a date.";
  } else if (!isValidISODate(date)) {
    errors.date = "Use a real date in YYYY-MM-DD form.";
  } else if (date > today()) {
    errors.date = "Date can't be in the future.";
  } else if (date < "1970-01-01") {
    errors.date = "Date is too far in the past.";
  }

  // --- description ----------------------------------------------------
  const description = values.description.trim();
  if (!description) {
    errors.description = "Add a short description.";
  } else if (description.length < 2) {
    errors.description = "Description is too short.";
  } else if (description.length > MAX_DESCRIPTION) {
    errors.description = `Keep it under ${MAX_DESCRIPTION} characters.`;
  }

  if (Object.keys(errors).length > 0) {
    return { errors, draft: null };
  }

  return {
    errors,
    draft: {
      amount: roundMoney(amount),
      category: values.category as ExpenseDraft["category"],
      date,
      description,
    },
  };
}
