import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleCoachMessage, type CoachTraits } from "@/lib/coach";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { message, goalId } = body as {
    message?: string;
    goalId?: string;
    // Accepted for forward compatibility: the UI sends a sessionId so the
    // coach can eventually track curtness across a conversation. There's no
    // server-side session store yet, so it's unused here.
    sessionId?: string;
  };

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  let goal: { title: string; difficulty: 1 | 2 | 3 } | null = null;
  if (goalId) {
    const found = await prisma.goal.findUnique({ where: { id: goalId } });
    if (found) {
      goal = { title: found.title, difficulty: found.difficulty as 1 | 2 | 3 };
    }
  }

  // Real adaptivity: the coach's tone comes from the profile built during
  // onboarding, not a hardcoded persona. Absent traits are fine — the coach
  // falls back to its base prompt.
  const user = await prisma.user.findFirst();
  let traits: CoachTraits | undefined;
  if (user) {
    const stored = await prisma.userTraits.findUnique({
      where: { userId: user.id },
      select: { communicationStyle: true, motivationStyle: true },
    });
    if (stored) {
      traits = {
        communicationStyle: stored.communicationStyle,
        motivationStyle: stored.motivationStyle,
      };
    }
  }

  try {
    const reply = await handleCoachMessage(message, goal, traits);
    return NextResponse.json(reply);
  } catch (err) {
    // Labeled fallback, never a hidden canned reply — see risk mitigations
    // in the design doc: hidden fakes are disqualifying, labeled ones are fine.
    console.error("Coach LLM call failed:", err);
    return NextResponse.json(
      { reply: "(coach is offline right now — try again in a moment)" },
      { status: 200 }
    );
  }
}
