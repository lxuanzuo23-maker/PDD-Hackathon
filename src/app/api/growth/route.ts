import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bucketLedgerByDay, dayStatus, formatDayLabel } from "@/lib/growth";
import { dayRange, startOfUTCDay, toUTCDateString } from "@/lib/goals";
import type { GoalSummary, GrowthResponse } from "@/lib/contract";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const goalId = req.nextUrl.searchParams.get("goalId");
  if (!goalId) {
    return NextResponse.json({ error: "goalId is required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json(
      { error: "no demo user — run npm run seed" },
      { status: 500 }
    );
  }

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: user.id },
  });
  if (!goal) {
    return NextResponse.json({ error: "That goal no longer exists." }, { status: 404 });
  }

  const now = new Date();
  const today = startOfUTCDay(now);
  const todayLabel = toUTCDateString(today);

  // Report from the goal's start through today, or through its end date if
  // the run already finished — never past the end of the goal.
  const rangeEnd = goal.endDate.getTime() < today.getTime() ? goal.endDate : today;
  const days =
    goal.startDate.getTime() > rangeEnd.getTime()
      ? [] // goal starts in the future: nothing to report yet
      : dayRange(goal.startDate, rangeEnd);

  const [checkIns, ledgerRows] = await Promise.all([
    prisma.checkIn.findMany({
      where: { goalId: goal.id },
      select: { createdAt: true, verdict: true, multiplier: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pointsLedger.findMany({
      where: { userId: user.id, goalId: goal.id },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const byDay = bucketLedgerByDay(
    ledgerRows.map((row) => ({
      date: toUTCDateString(row.createdAt),
      amount: row.amount,
    }))
  );

  const checkedInDays = new Set(checkIns.map((c) => toUTCDateString(c.createdAt)));
  const verdictByDay = new Map(
    checkIns.map((c) => [toUTCDateString(c.createdAt), c.verdict as "accepted" | "partial"])
  );

  const pointsSeries = days.map((day) => {
    const totals = byDay.get(day) ?? { earned: 0, penalty: 0 };
    return { date: formatDayLabel(day), earned: totals.earned, penalty: totals.penalty };
  });

  const history = days.map((day) => {
    const status = dayStatus(day, todayLabel, checkedInDays);
    const totals = byDay.get(day);

    if (status === "done") {
      return {
        date: formatDayLabel(day),
        status,
        verdict: verdictByDay.get(day),
        points: totals?.earned ?? 0,
      };
    }
    if (status === "skipped") {
      // Nominal cost of skipping a period. The actual deduction is written
      // lazily on the user's next visit, so its ledger date may differ from
      // the day skipped (see DISCLOSURES.md) — the summary's netPoints below
      // uses real ledger sums, so the headline numbers stay exact.
      return { date: formatDayLabel(day), status, points: -goal.penaltyPoints };
    }
    return { date: formatDayLabel(day), status };
  });

  const checkInsExpected = days.length;
  const checkInsDone = checkIns.length;
  const netPoints = ledgerRows.reduce((sum, row) => sum + row.amount, 0);

  const summary: GrowthResponse["summary"] = {
    checkInsDone,
    checkInsExpected,
    skips: Math.max(history.filter((entry) => entry.status === "skipped").length, 0),
    netPoints,
  };

  const goalSummary: GoalSummary = {
    id: goal.id,
    title: goal.title,
    startDate: goal.startDate.toISOString(),
    endDate: goal.endDate.toISOString(),
    createdAt: goal.createdAt.toISOString(),
    status:
      goal.status === "active" && goal.endDate.getTime() >= now.getTime() ? "active" : "ended",
  };

  const response: GrowthResponse = {
    goal: goalSummary,
    summary,
    pointsSeries,
    history,
  };

  return NextResponse.json(response);
}
