/**
 * growth.ts — pure date/streak math for the growth dashboard. No I/O, no
 * Prisma: takes plain date/amount data in, returns plain numbers out —
 * same testability pattern as points.ts.
 */

export interface DailyLedgerEntry {
  date: string; // "YYYY-MM-DD", UTC
  amount: number;
}

/**
 * Longest run of consecutive UTC calendar days present in `checkInDays`.
 * Duplicate dates are fine (deduped internally); order doesn't matter.
 */
export function longestStreak(checkInDays: string[]): number {
  const uniqueDays = Array.from(new Set(checkInDays)).sort();
  if (uniqueDays.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(`${uniqueDays[i - 1]}T00:00:00Z`);
    const curr = new Date(`${uniqueDays[i]}T00:00:00Z`);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    current = diffDays === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

/**
 * Given a set of ledger entries and an ordered ascending list of days to
 * report on, returns the running (cumulative) balance for each day.
 * `startingBalance` should be the sum of everything before the first day
 * in `days`, so the first reported point reflects true history instead of
 * resetting to zero.
 */
export function buildRunningBalance(
  entries: DailyLedgerEntry[],
  days: string[],
  startingBalance = 0
): number[] {
  const byDay = new Map<string, number>();
  for (const entry of entries) {
    byDay.set(entry.date, (byDay.get(entry.date) ?? 0) + entry.amount);
  }

  let running = startingBalance;
  return days.map((day) => {
    running += byDay.get(day) ?? 0;
    return running;
  });
}
