import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toUTCDateString } from "@/lib/goals";
import type { CompanionMood, Mood, ProfileResponse, TraitsProfile } from "@/lib/contract";

export const dynamic = "force-dynamic";

const RECENT_MOOD_LIMIT = 14;

export async function GET() {
  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json(
      { error: "no demo user — run npm run seed" },
      { status: 500 }
    );
  }

  const [traits, moods, ledgerAgg, activeGoals, totalCheckIns, companion] =
    await Promise.all([
      prisma.userTraits.findUnique({ where: { userId: user.id } }),
      prisma.moodCheckIn.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: RECENT_MOOD_LIMIT,
        select: { mood: true, createdAt: true },
      }),
      prisma.pointsLedger.aggregate({
        where: { userId: user.id },
        _sum: { amount: true },
      }),
      prisma.goal.count({ where: { userId: user.id, status: "active" } }),
      prisma.checkIn.count({ where: { goal: { userId: user.id } } }),
      prisma.companionState.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      }),
    ]);

  // Themes are stored JSON-encoded; a malformed value should degrade to an
  // empty list rather than 500 the whole profile.
  let visionBoardThemes: string[] = [];
  if (traits?.visionBoardThemes) {
    try {
      const parsed = JSON.parse(traits.visionBoardThemes);
      if (Array.isArray(parsed)) {
        visionBoardThemes = parsed.filter((t): t is string => typeof t === "string");
      }
    } catch {
      visionBoardThemes = [];
    }
  }

  const response: ProfileResponse = {
    onboarded: traits !== null,
    ...(traits
      ? {
          age: traits.age,
          gender: traits.gender,
          ...(traits.habitToImprove ? { habitToImprove: traits.habitToImprove } : {}),
          ...(traits.newHabitGoal ? { newHabitGoal: traits.newHabitGoal } : {}),
          ...(traits.visionBoardImageUrl
            ? { visionBoardImageUrl: traits.visionBoardImageUrl }
            : {}),
          communicationStyle: traits.communicationStyle as TraitsProfile["communicationStyle"],
          motivationStyle: traits.motivationStyle as TraitsProfile["motivationStyle"],
        }
      : {}),
    visionBoardThemes,
    recentMoods: moods.map((m) => ({
      mood: m.mood as Mood,
      date: toUTCDateString(m.createdAt),
    })),
    stats: {
      streakDays: user.streak,
      pointsBalance: ledgerAgg._sum.amount ?? 0,
      activeGoals,
      totalCheckIns,
    },
    companion: {
      level: companion.level,
      xp: companion.xp,
      mood: companion.mood as CompanionMood,
    },
  };

  return NextResponse.json(response);
}
