import { parseISODate } from "./date";

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyWhole = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return currency.format(amount);
}

/** Compact form for axis ticks and tight chart labels: $1.2K, $18M. */
export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `$${trimZero(amount / 1_000_000)}M`;
  }
  if (abs >= 1_000) {
    return `$${trimZero(amount / 1_000)}K`;
  }
  return currencyWhole.format(amount);
}

function trimZero(value: number): string {
  return value
    .toFixed(1)
    .replace(/\.0$/, "")
    .replace(/^(-?)(\d)/, "$1$2");
}

export function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return "0%";
  const pct = fraction * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

/** "Mar 4, 2026" */
export function formatDate(isoDate: string): string {
  const date = parseISODate(isoDate);
  if (!date) return isoDate;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "Mar 4" — for dense rows where the year is implied. */
export function formatDateShort(isoDate: string): string {
  const date = parseISODate(isoDate);
  if (!date) return isoDate;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "March 2026" from a `YYYY-MM` key. */
export function formatMonthKey(key: string, short = false): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: short ? "short" : "long",
    year: "numeric",
  });
}

/** "Today" / "Yesterday" / "Mar 4, 2026" */
export function formatRelativeDate(isoDate: string): string {
  const date = parseISODate(isoDate);
  if (!date) return isoDate;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round(
    (date.getTime() - startToday.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";
  return formatDate(isoDate);
}
