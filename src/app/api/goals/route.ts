import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateMissedDayPenalty } from "@/lib/points";
import type { Goal, GoalsResponse, PenaltyResult, CreateGoalRequest } from "@/lib/contract";

// No real auth in this demo — one seeded user, per DISCLOSURES.md.
async function getDemoUser() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No demo user found — did you run `npm run seed`?");
  return user;
}

/** Whole-day difference between two dates, in UTC calendar days. */
function daysBetweenUTC(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((utcB - utcA) / 86400000);
}

/**
 * How many full check-in periods have been missed since the goal's last
 * check-in (or its start date, if never checked in). The current
 * still-open period (today, or this week) is never counted as missed —
 * this is a lazy check, so it only ever looks backward.
 */
function missedPeriodsFor(
  goal: { checkInFrequency: string; lastCheckInAt: Date | null; startDate: Date },
  now: Date
): number {
  const anchor = goal.lastCheckInAt ?? goal.startDate;
  const daysSince = daysBetweenUTC(anchor, now);
  if (goal.checkInFrequency === "weekly") {
    return Math.max(Math.floor((daysSince - 1) / 7), 0);
  }
  return Math.max(daysSince - 1, 0);
}

function periodLengthMs(checkInFrequency: string): number {
  return checkInFrequency === "weekly" ? 7 * 86400000 : 86400000;
}

export async function GET() {
  const user = await getDemoUser();
  const now = new Date();

  const activeGoals = await prisma.goal.findMany({
    where: { userId: user.id, status: "active" },
    orderBy: { createdAt: "asc" },
  });

  const penaltiesApplied: PenaltyResult[] = [];

  for (const goal of activeGoals) {
    const missedPeriods = missedPeriodsFor(goal, now);
    if (missedPeriods <= 0) continue;

    const { pointsLost } = calculateMissedDayPenalty({
      penaltyPerPeriod: goal.penaltyPoints,
      missedPeriods,
    });
    if (pointsLost <= 0) continue;

    // Advance lastCheckInAt forward by the periods we just charged for, so
    // the next lazy check doesn't re-penalize the same missed days.
    const anchor = goal.lastCheckInAt ?? goal.startDate;
    const newAnchor = new Date(
      anchor.getTime() + missedPeriods * periodLengthMs(goal.checkInFrequency)
    );

    await prisma.$transaction([
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
        data: { lastCheckInAt: newAnchor },
      }),
    ]);

    penaltiesApplied.push({ goalId: goal.id, missedPeriods, pointsLost });
  }

  // Re-fetch after any penalty writes so the response reflects them.
  const [goals, ledgerAgg, companion] = await Promise.all([
    prisma.goal.findMany({
      where: { userId: user.id, status: "active" },
      orderBy: { createdAt: "asc" },
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

  const response: GoalsResponse = {
    goals: goals.map(
      (g): Goal => ({
        id: g.id,
        title: g.title,
        category: g.category,
        difficulty: g.difficulty as 1 | 2 | 3,
        status: g.status as Goal["status"],
        startDate: g.startDate.toISOString(),
        endDate: g.endDate.toISOString(),
        checkInFrequency: g.checkInFrequency as Goal["checkInFrequency"],
        penaltyPoints: g.penaltyPoints,
        lastCheckInAt: g.lastCheckInAt?.toISOString(),
        createdAt: g.createdAt.toISOString(),
      })
    ),
    streakDays: user.streak,
    pointsBalance: ledgerAgg._sum.amount ?? 0,
    companion: {
      level: companion.level,
      xp: companion.xp,
      mood: companion.mood as "content" | "proud" | "sleepy" | "worried",
    },
    ...(penaltiesApplied.length > 0 ? { penaltiesApplied } : {}),
  };

  return NextResponse.json(response);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    title,
    category,
    difficulty,
    startDate,
    endDate,
    checkInFrequency,
    penaltyPoints,
  } = body as Partial<CreateGoalRequest>;

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!category || typeof category !== "string") {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  if (typeof difficulty !== "number" || ![1, 2, 3].includes(difficulty)) {
    return NextResponse.json({ error: "difficulty must be 1, 2, or 3" }, { status: 400 });
  }
  if (!endDate || Number.isNaN(Date.parse(endDate))) {
    return NextResponse.json({ error: "endDate must be a valid ISO date" }, { status: 400 });
  }
  if (checkInFrequency !== "daily" && checkInFrequency !== "weekly") {
    return NextResponse.json(
      { error: "checkInFrequency must be 'daily' or 'weekly'" },
      { status: 400 }
    );
  }
  if (typeof penaltyPoints !== "number" || penaltyPoints < 0) {
    return NextResponse.json({ error: "penaltyPoints must be >= 0" }, { status: 400 });
  }

  const user = await getDemoUser();
  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title,
      category,
      difficulty,
      startDate: startDate && !Number.isNaN(Date.parse(startDate)) ? new Date(startDate) : undefined,
      endDate: new Date(endDate),
      checkInFrequency,
      penaltyPoints,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
