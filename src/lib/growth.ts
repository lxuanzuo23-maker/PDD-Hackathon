/**
 * growth.ts — pure helpers for the per-goal growth dashboard. No I/O, no
 * Prisma: same testability discipline as points.ts and goals.ts.
 *
 * Note: the UI renders `date` strings directly (and strips the month for
 * chart labels), so these are short display labels like "Jul 20" rather
 * than ISO dates. That's display formatting in an API payload, which is a
 * little unusual — it's done deliberately to match Person B's rendering
 * rather than making every page reformat.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-07-20" -> "Jul 20" */
export function formatDayLabel(isoDay: string): string {
  const [, month, day] = isoDay.split("-");
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return isoDay;
  return `${monthName} ${Number(day)}`;
}

export interface LedgerEntry {
  /** "YYYY-MM-DD", UTC */
  date: string;
  amount: number;
}

export interface DayTotals {
  earned: number;
  penalty: number;
}

/**
 * Splits ledger rows into per-day earned (positive) and penalty (absolute
 * value of negative) totals. Redemption rows are account-wide rather than
 * goal-scoped, so callers should pass only goal-scoped entries.
 */
export function bucketLedgerByDay(entries: LedgerEntry[]): Map<string, DayTotals> {
  const byDay = new Map<string, DayTotals>();
  for (const entry of entries) {
    const totals = byDay.get(entry.date) ?? { earned: 0, penalty: 0 };
    if (entry.amount >= 0) {
      totals.earned += entry.amount;
    } else {
      totals.penalty += Math.abs(entry.amount);
    }
    byDay.set(entry.date, totals);
  }
  return byDay;
}

/**
 * Status of a single day within a goal's run, derived from actual check-in
 * dates (not from penalty ledger dates, which are lazily written whenever
 * the user reopens the app and therefore don't identify the day skipped).
 */
export function dayStatus(
  day: string,
  today: string,
  checkedInDays: Set<string>
): "done" | "skipped" | "due" | "future" {
  if (checkedInDays.has(day)) return "done";
  if (day > today) return "future";
  if (day === today) return "due";
  return "skipped";
}
