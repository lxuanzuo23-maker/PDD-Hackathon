/**
 * goals.ts — pure date/period math for goals. No I/O, no Prisma: same
 * testability discipline as points.ts and growth.ts.
 *
 * All comparisons are on UTC calendar days. "Period" means one check-in
 * window; only daily cadence ships in the demo, so a period is a day.
 */

export function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function toUTCDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Whole UTC calendar days from `a` to `b`. Negative if `b` precedes `a`. */
export function daysBetweenUTC(a: Date, b: Date): number {
  return Math.round((startOfUTCDay(b).getTime() - startOfUTCDay(a).getTime()) / 86400000);
}

export function isSameUTCDay(a: Date, b: Date): boolean {
  return daysBetweenUTC(a, b) === 0;
}

export interface GoalDateFields {
  startDate: Date;
  endDate: Date;
  lastCheckInAt: Date | null;
}

/**
 * Where today sits inside the goal's run.
 * `periodTotal` counts startDate..endDate inclusive; `periodDay` is the
 * 1-based index of today, clamped into range so the UI never renders
 * "day 0 of 30" or "day 45 of 30".
 */
export function periodInfo(
  goal: Pick<GoalDateFields, "startDate" | "endDate">,
  now: Date
): { periodDay: number; periodTotal: number } {
  const periodTotal = Math.max(daysBetweenUTC(goal.startDate, goal.endDate) + 1, 1);
  const rawDay = daysBetweenUTC(goal.startDate, now) + 1;
  const periodDay = Math.min(Math.max(rawDay, 1), periodTotal);
  return { periodDay, periodTotal };
}

/**
 * Today's actionable status for a goal.
 *
 * NOTE for Person B: "missed" is only emitted when the goal's endDate has
 * already passed — a run that ran out. It is NOT used for "you skipped
 * yesterday", because today/page.tsx renders no action buttons for
 * "missed", and a skipped yesterday must not make today un-checkable.
 * Skipped days are surfaced separately via PenaltyNotice + the growth
 * history, not by disabling the goal.
 */
export function todayStatus(
  goal: GoalDateFields,
  now: Date
): "due" | "done" | "missed" {
  if (goal.lastCheckInAt && isSameUTCDay(goal.lastCheckInAt, now)) return "done";
  if (daysBetweenUTC(goal.endDate, now) > 0) return "missed";
  return "due";
}

/**
 * How many full check-in periods were missed since the last check-in (or
 * the goal's start, if never checked in). The current still-open period is
 * never counted — this is a backward-looking lazy check.
 *
 * Periods after `endDate` are not charged: a finished goal stops accruing
 * penalties instead of billing forever.
 */
export function missedPeriods(goal: GoalDateFields, now: Date): number {
  const anchor = goal.lastCheckInAt ?? goal.startDate;
  // Never charge past the end of the goal's run.
  const effectiveNow = daysBetweenUTC(goal.endDate, now) > 0 ? goal.endDate : now;
  const daysSince = daysBetweenUTC(anchor, effectiveNow);
  return Math.max(daysSince - 1, 0);
}

/** Anchor date to store after charging `periods` missed days. */
export function advancedAnchor(anchor: Date, periods: number): Date {
  const next = startOfUTCDay(anchor);
  next.setUTCDate(next.getUTCDate() + periods);
  return next;
}

/** Every UTC day from `from` to `to` inclusive, as "YYYY-MM-DD". */
export function dayRange(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = startOfUTCDay(from);
  const last = startOfUTCDay(to);
  while (cursor.getTime() <= last.getTime()) {
    days.push(toUTCDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
