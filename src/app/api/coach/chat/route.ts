import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleCoachMessage } from "@/lib/coach";

// Person A note: the goals pivot removed the Task model, which broke this
// route's compile. Fixed mechanically here (taskId -> goalId, Task -> Goal)
// to keep the build/deploy green. The coach *logic* is still Person C's:
// see the two outstanding items in TEAM_HANDOFF.md — passing TraitsProfile
// through for tone adaptation, and returning the nested
// `microStep: { description, timerSeconds }` shape the UI expects instead
// of today's flat `{ microStep: string, timerSeconds }`.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, goalId } = body as {
    message?: string;
    goalId?: string;
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

  try {
    const reply = await handleCoachMessage(message, goal);
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
