import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateMissedDayPenalty } from "@/lib/points";
import { advancedAnchor, missedPeriods, periodInfo, todayStatus } from "@/lib/goals";
import type {
  CompanionMood,
  GoalToday,
  GoalsTodayResponse,
  PenaltyNotice,
} from "@/lib/contract";

export const dynamic = "force-dynamic";

async function getDemoUser() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No demo user found — did you run `npm run seed`?");
  return user;
}

/**
 * GET /api/goals/today — the daily action feed, and the ONE place the lazy
 * missed-day penalty check runs. Opening this page is what triggers
 * deductions; no background job exists (a deliberate scope decision).
 */
export async function GET() {
  const user = await getDemoUser();
  const now = new Date();

  const activeGoals = await prisma.goal.findMany({
    where: { userId: user.id, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  const penaltiesApplied: PenaltyNotice[] = [];

  for (const goal of activeGoals) {
    const missed = missedPeriods(goal, now);
    if (missed <= 0) continue;

    const { pointsLost } = calculateMissedDayPenalty({
      penaltyPerPeriod: goal.penaltyPoints,
      missedPeriods: missed,
    });
    if (pointsLost <= 0) continue;

    const anchor = goal.lastCheckInAt ?? goal.startDate;

    // Advance the anchor by exactly the periods charged so a refresh can't
    // bill the same missed days twice.
    const [ledgerRow] = await prisma.$transaction([
      prisma.pointsLedger.create({
        data: {
          userId: user.id,
          amount: -pointsLost,
          reason: "penalty",
          goalId: goal.id,
        },
      }),
      prisma.goal.update({
        where: { id: goal.id },
        data: { lastCheckInAt: advancedAnchor(anchor, missed) },
      }),
    ]);

    penaltiesApplied.push({
      // Ledger row id — the UI dedupes notices on this, so a refresh does
      // not re-announce a penalty the user already saw.
      id: ledgerRow.id,
      goalId: goal.id,
      goalTitle: goal.title,
      daysMissed: missed,
      pointsDeducted: pointsLost,
      // Filled in below, once the final balance is known.
      newBalance: 0,
    });
  }

  // Re-read after any penalty writes so the response reflects them.
  const [goals, ledgerAgg, companion] = await Promise.all([
    prisma.goal.findMany({
      where: { userId: user.id, status: "active" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pointsLedger.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),
    prisma.companionState.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    }),
  ]);

  const pointsBalance = ledgerAgg._sum.amount ?? 0;
  for (const notice of penaltiesApplied) {
    notice.newBalance = pointsBalance;
  }

  const response: GoalsTodayResponse = {
    streakDays: user.streak,
    pointsBalance,
    companion: {
      level: companion.level,
      xp: companion.xp,
      mood: companion.mood as CompanionMood,
    },
    penaltiesApplied,
    goals: goals.map((goal): GoalToday => {
      const { periodDay, periodTotal } = periodInfo(goal, now);
      return {
        id: goal.id,
        title: goal.title,
        startDate: goal.startDate.toISOString(),
        endDate: goal.endDate.toISOString(),
        createdAt: goal.createdAt.toISOString(),
        cadence: "daily",
        todayStatus: todayStatus(goal, now),
        periodDay,
        periodTotal,
      };
    }),
  };

  return NextResponse.json(response);
}
