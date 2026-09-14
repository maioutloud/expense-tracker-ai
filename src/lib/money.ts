/**
 * Money helpers.
 *
 * Amounts are stored as major units (dollars) but every sum goes through integer
 * cents: adding 0.1 + 0.2 in binary floating point yields 0.30000000000000004, and
 * a few hundred of those drift into visibly wrong totals.
 */

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function roundMoney(amount: number): number {
  return fromCents(toCents(amount));
}

export function sumAmounts(amounts: number[]): number {
  let cents = 0;
  for (const amount of amounts) cents += toCents(amount);
  return fromCents(cents);
}
