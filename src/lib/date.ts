/**
 * Calendar-date helpers.
 *
 * Expense dates are calendar dates (`YYYY-MM-DD`), not instants. `new Date("2026-03-01")`
 * parses as UTC midnight and renders as Feb 28 in any negative-offset timezone, so every
 * conversion here goes through local-time constructors instead.
 */

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses `YYYY-MM-DD` into a local-midnight Date. Returns null if malformed. */
export function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(year, month - 1, day);
  // Rejects overflow like 2026-02-31, which the Date constructor silently rolls forward.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isValidISODate(value: string): boolean {
  return parseISODate(value) !== null;
}

export function today(): string {
  return toISODate(new Date());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** `YYYY-MM` key used to bucket expenses by month. */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive day count between two calendar dates. */
export function daysBetween(from: Date, to: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / ms) + 1;
}
