import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCompletion } from "@/lib/verifier";
import { calculatePoints } from "@/lib/points";
import type { CheckInRequest, CheckInResponse } from "@/lib/contract";

/** True if `a` and `b` fall in the same UTC calendar day. */
function isSameUTCDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** True if `a` and `b` fall in the same UTC calendar week (Sun-Sat). */
function isSameUTCWeek(a: Date, b: Date): boolean {
  const startOfWeek = (d: Date) => {
    const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    copy.setUTCDate(copy.getUTCDate() - copy.getUTCDay());
    return copy.getTime();
  };
  return startOfWeek(a) === startOfWeek(b);
}

// Maps the verifier's continuous multiplier to the P0 verdict bands.
// "rejected" is not emitted in P0 — see DESIGN.md F5.
function verdictFromMultiplier(multiplier: number): "accepted" | "partial" {
  return multiplier >= 1.5 ? "accepted" : "partial";
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { answers, feeling } = body as Partial<CheckInRequest>;

  const trimmedAnswers = (answers ?? []).map((a) => (typeof a === "string" ? a.trim() : ""));
  const validAnswers =
    Array.isArray(answers) &&
    answers.length === 2 &&
    trimmedAnswers.every((a) => a.length > 0);
  const validFeeling = typeof feeling === "string" && feeling.trim().length > 0;

  if (!validAnswers || !validFeeling) {
    return NextResponse.json(
      { error: "answers must be a two-element array of non-empty strings, and feeling is required" },
      { status: 400 }
    );
  }

  const goal = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!goal) {
    return NextResponse.json({ error: "goal not found" }, { status: 404 });
  }
  if (goal.status !== "active") {
    return NextResponse.json({ error: "goal is not active" }, { status: 409 });
  }

  const now = new Date();
  const alreadyCheckedInThisPeriod =
    goal.lastCheckInAt !== null &&
    (goal.checkInFrequency === "weekly"
      ? isSameUTCWeek(goal.lastCheckInAt, now)
      : isSameUTCDay(goal.lastCheckInAt, now));
  if (alreadyCheckedInThisPeriod) {
    return NextResponse.json(
      { error: "already checked in for this period" },
      { status: 409 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: goal.userId } });
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  // NOTE for Person C: verifyCompletion currently only takes the two
  // answers. It needs to also accept `feeling` so the honesty check can
  // weigh emotional-consistency against the stated answers — update
  // verifier.ts's signature and prompts/verifier_typescript.prompt
  // together. Passed through as a third arg here so this route doesn't
  // need to change again once that lands; verifier.ts should start
  // reading it.
  const { multiplier, verdict: verdictMessage } = await verifyCompletion(
    { title: goal.title, difficulty: goal.difficulty as 1 | 2 | 3 },
    [trimmedAnswers[0], trimmedAnswers[1]],
    feeling
  );

  const isFirstToday = !user.lastStreakAt || !isSameUTCDay(user.lastStreakAt, now);

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const earnedTodayAgg = await prisma.pointsLedger.aggregate({
    where: { userId: user.id, createdAt: { gte: startOfToday } },
    _sum: { amount: true },
  });

  const { points } = calculatePoints({
    difficulty: goal.difficulty as 1 | 2 | 3,
    multiplier,
    isFirstToday,
    pointsEarnedToday: earnedTodayAgg._sum.amount ?? 0,
  });

  const verdict = verdictFromMultiplier(multiplier);

  await prisma.$transaction([
    prisma.goal.update({
      where: { id: goal.id },
      data: { lastCheckInAt: now },
    }),
    prisma.checkIn.create({
      data: {
        goalId: goal.id,
        answers: JSON.stringify(trimmedAnswers),
        feeling,
        verdict,
        verdictMessage,
        multiplier,
      },
    }),
    prisma.pointsLedger.create({
      data: {
        userId: user.id,
        amount: points,
        reason: "goal-checkin",
        goalId: goal.id,
      },
    }),
    ...(isFirstToday
      ? [
          prisma.user.update({
            where: { id: user.id },
            data: { streak: { increment: 1 }, lastStreakAt: now },
          }),
        ]
      : []),
  ]);

  const [ledgerAgg, companion, refreshedUser] = await Promise.all([
    prisma.pointsLedger.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),
    prisma.companionState.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
  ]);

  const response: CheckInResponse = {
    verdict,
    verdictMessage,
    multiplier,
    pointsAwarded: points,
    newBalance: ledgerAgg._sum.amount ?? 0,
    streakDays: refreshedUser.streak,
    companion: {
      level: companion.level,
      xp: companion.xp,
      mood: companion.mood as "content" | "proud" | "sleepy" | "worried",
    },
  };

  return NextResponse.json(response);
}
