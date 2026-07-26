import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCompletion } from "@/lib/verifier";
import { calculatePoints } from "@/lib/points";
import { isSameUTCDay } from "@/lib/goals";
import { createBandGoalRoom, requestGoalReflection } from "@/lib/band";
import type { CheckInRequest, CheckInResponse, CompanionMood, Mood } from "@/lib/contract";

const VALID_MOODS: Mood[] = ["rough", "low", "okay", "good", "great"];

// Band notify is additive: a check-in must never fail or slow down because
// the Goal Room is unreachable — labeled log only, no hidden retry.
async function queueGoalReflection(
  goal: { id: string; title: string; bandRoomId: string | null },
  checkInId: string
) {
  if (!process.env.BAND_COACH_API_KEY || !process.env.BAND_REFLECTION_AGENT_ID) {
    console.warn("band notify skipped: BAND_* env not configured");
    return;
  }
  try {
    let roomId = goal.bandRoomId;
    if (!roomId) {
      roomId = await createBandGoalRoom(goal.title);
      await prisma.goal.update({
        where: { id: goal.id },
        data: { bandRoomId: roomId },
      });
    }
    await requestGoalReflection({ roomId, goalId: goal.id, checkInId });
  } catch (err) {
    console.error("band goal-room notify failed (non-blocking):", err);
  }
}

/**
 * Maps the verifier's continuous multiplier to the P0 verdict bands.
 * "rejected" is not emitted in P0 — it would require a verifier contract
 * with multiplier 0, not a reinterpretation of a clamped 0.5x.
 */
function verdictFromMultiplier(multiplier: number): "accepted" | "partial" {
  return multiplier >= 1.5 ? "accepted" : "partial";
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const { answers } = body as Partial<CheckInRequest>;

  // answers is positional: [whatIDid, hardestPart, mood]
  if (!Array.isArray(answers) || answers.length !== 3) {
    return NextResponse.json(
      { error: "Answer all three check-in questions." },
      { status: 400 }
    );
  }

  const whatIDid = typeof answers[0] === "string" ? answers[0].trim() : "";
  const hardestPart = typeof answers[1] === "string" ? answers[1].trim() : "";
  const mood = answers[2] as Mood;

  if (!whatIDid || !hardestPart || !VALID_MOODS.includes(mood)) {
    return NextResponse.json(
      { error: "Answer all three check-in questions." },
      { status: 400 }
    );
  }

  const goal = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!goal) {
    return NextResponse.json({ error: "That goal no longer exists." }, { status: 404 });
  }
  if (goal.status !== "active") {
    return NextResponse.json({ error: "That goal has ended." }, { status: 409 });
  }

  const now = new Date();

  // Per-period idempotency: one check-in per goal per UTC day. Checked
  // before the verifier so a double-tap can't burn an LLM call.
  if (goal.lastCheckInAt && isSameUTCDay(goal.lastCheckInAt, now)) {
    return NextResponse.json(
      { error: "Already checked in today — see you tomorrow." },
      { status: 409 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: goal.userId } });
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  // Person C's verifier takes the mood as an optional third element of the
  // answers tuple (not a separate argument) and treats it as supporting
  // reflection context — a hard feeling is never itself a penalty.
  const { multiplier, verdict: verdictMessage } = await verifyCompletion(
    { title: goal.title, difficulty: goal.difficulty as 1 | 2 | 3 },
    [whatIDid, hardestPart, mood]
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
    pointsEarnedToday: Math.max(earnedTodayAgg._sum.amount ?? 0, 0),
  });

  const verdict = verdictFromMultiplier(multiplier);

  const txResults = await prisma.$transaction([
    prisma.goal.update({
      where: { id: goal.id },
      data: { lastCheckInAt: now },
    }),
    prisma.checkIn.create({
      data: {
        goalId: goal.id,
        answers: JSON.stringify([whatIDid, hardestPart]),
        feeling: mood,
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
    prisma.moodCheckIn.create({
      data: { userId: user.id, mood },
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
      mood: companion.mood as CompanionMood,
    },
  };

  // txResults[1] is the CheckIn row (conditional spread widens the tuple type).
  const checkInRow = txResults[1] as { id: string };
  void queueGoalReflection(goal, checkInRow.id);

  return NextResponse.json(response);
}
