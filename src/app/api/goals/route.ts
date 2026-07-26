import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { periodInfo, todayStatus } from "@/lib/goals";
import {
  DEFAULT_GOAL_DIFFICULTY,
  DEFAULT_MISSED_PENALTY,
  type CreateGoalRequest,
  type GoalListResponse,
  type GoalSummary,
  type GoalToday,
} from "@/lib/contract";

export const dynamic = "force-dynamic";

// No real auth in this demo — one seeded user, per DISCLOSURES.md.
async function getDemoUser() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No demo user found — did you run `npm run seed`?");
  return user;
}

/**
 * GET /api/goals -> { active, ended }
 *
 * This is the goal *picker* feed (used by the growth page), deliberately
 * separate from GET /api/goals/today, which is the daily action feed and
 * is the only place the lazy penalty check runs. Keeping the penalty write
 * out of this route means opening the growth page can't silently deduct
 * points.
 */
export async function GET() {
  const user = await getDemoUser();
  const now = new Date();

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const toSummary = (g: (typeof goals)[number]): GoalSummary => ({
    id: g.id,
    title: g.title,
    startDate: g.startDate.toISOString(),
    endDate: g.endDate.toISOString(),
    createdAt: g.createdAt.toISOString(),
    status: g.status === "active" && g.endDate.getTime() >= now.getTime() ? "active" : "ended",
  });

  const summaries = goals.map(toSummary);
  const response: GoalListResponse = {
    active: summaries.filter((g) => g.status === "active"),
    ended: summaries.filter((g) => g.status === "ended"),
  };

  return NextResponse.json(response);
}

/**
 * POST /api/goals — the UI only collects a title, an end date, and a
 * cadence. Difficulty and penalty are not asked for, so they come from the
 * frozen defaults in contract.ts rather than being invented here.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { title, endDate, cadence } = body as Partial<CreateGoalRequest>;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Give your goal a title." }, { status: 400 });
  }
  if (!endDate || Number.isNaN(Date.parse(endDate))) {
    return NextResponse.json({ error: "Pick a valid end date." }, { status: 400 });
  }
  if (cadence !== undefined && cadence !== "daily") {
    return NextResponse.json(
      { error: "Only daily check-ins are supported right now." },
      { status: 400 }
    );
  }

  const parsedEnd = new Date(endDate);
  const now = new Date();
  if (parsedEnd.getTime() < now.getTime()) {
    return NextResponse.json({ error: "End date must be in the future." }, { status: 400 });
  }

  const user = await getDemoUser();
  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: title.trim(),
      // Free-text category isn't collected by the UI; goals are user-defined
      // so this stays generic rather than guessing a taxonomy.
      category: "general",
      difficulty: DEFAULT_GOAL_DIFFICULTY,
      endDate: parsedEnd,
      checkInFrequency: "daily",
      penaltyPoints: DEFAULT_MISSED_PENALTY,
    },
  });

  const { periodDay, periodTotal } = periodInfo(goal, now);
  const created: GoalToday = {
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

  return NextResponse.json(created, { status: 201 });
}
