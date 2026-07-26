import { NextRequest, NextResponse } from "next/server";
import { chatJSON } from "@/lib/llm";
import { verifyBandWorkerSignature } from "@/lib/band-security";
import { appendGoalRoomEvent } from "@/lib/goal-room";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyBandWorkerSignature(rawBody, req.headers.get("X-TinyWins-Signature"))) {
    return NextResponse.json({ error: "unauthorized worker callback" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as {
    goalId?: string;
    checkInId?: string;
    roomId?: string;
    content?: string;
  };
  if (!body.goalId || !body.checkInId) {
    // A human typed at the agent in the Band room. Answer conversationally —
    // never a 400 to a person; labeled offline line if the LLM is down.
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "goalId and checkInId are required" }, { status: 400 });
    }
    try {
      const chat = await chatJSON<{ reply: string }>(
        [
          {
            role: "system",
            content:
              "You are TinyWins' Reflection Guide, reviewing goal check-in patterns. Reply to the message in 1-3 concise, non-judgmental sentences. Return JSON only: {\"reply\": string}.",
          },
          { role: "user", content },
        ],
        { temperature: 0.4, maxTokens: 200 }
      );
      return NextResponse.json({ ok: true, reply: chat.reply });
    } catch (err) {
      console.error("reflection free-text reply failed:", err);
      return NextResponse.json({
        ok: true,
        reply:
          "I'm connected, but my reflection engine is offline right now — I'll pick up your check-ins as soon as it's back.",
      });
    }
  }

  const checkIn = await prisma.checkIn.findFirst({
    where: { id: body.checkInId, goalId: body.goalId },
    include: { goal: true },
  });
  if (!checkIn) return NextResponse.json({ error: "check-in not found" }, { status: 404 });

  const existing = await prisma.reflection.findUnique({ where: { checkInId: checkIn.id } });
  if (existing) {
    return NextResponse.json({
      ok: true,
      reflectionId: existing.id,
      reply: `Reflection already saved: ${existing.summary}`,
    });
  }

  const analysis = await chatJSON<{ summary: string; insights: string[]; nextFocus?: string }>(
    [
      {
        role: "system",
        content:
          "You are TinyWins' Reflection Guide. Write a concise, non-judgmental reflection on one goal check-in. Return JSON only with summary, insights (up to 3 strings), and nextFocus.",
      },
      {
        role: "user",
        content: JSON.stringify({
          goal: checkIn.goal.title,
          answers: JSON.parse(checkIn.answers),
          verdict: checkIn.verdict,
          mood: checkIn.feeling,
        }),
      },
    ],
    { temperature: 0.3, maxTokens: 250 }
  );

  const reflection = await prisma.reflection.create({
    data: {
      goalId: checkIn.goalId,
      checkInId: checkIn.id,
      kind: "daily",
      summary: analysis.summary,
      insights: JSON.stringify(analysis.insights),
      nextFocus: analysis.nextFocus,
    },
  });
  await appendGoalRoomEvent({
    goalId: checkIn.goalId,
    userId: checkIn.goal.userId,
    type: "reflection.generated",
    payload: { reflectionId: reflection.id, summary: reflection.summary },
    idempotencyKey: `reflection:${checkIn.id}`,
  });

  return NextResponse.json({
    ok: true,
    reflectionId: reflection.id,
    reply: `Reflection saved for "${checkIn.goal.title}": ${reflection.summary}`,
  });
}
