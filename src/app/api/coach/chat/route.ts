import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleCoachMessage } from "@/lib/coach";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, taskId } = body as { message?: string; taskId?: string };

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  let task: { title: string; difficulty: 1 | 2 | 3 } | null = null;
  if (taskId) {
    const found = await prisma.task.findUnique({ where: { id: taskId } });
    if (found) {
      task = { title: found.title, difficulty: found.difficulty as 1 | 2 | 3 };
    }
  }

  try {
    const reply = await handleCoachMessage(message, task);
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
