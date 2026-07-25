import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCompletion } from "@/lib/verifier";
import { calculatePoints } from "@/lib/points";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { answers } = body as { answers?: string[] };

  if (!answers || answers.length !== 2) {
    return NextResponse.json(
      { error: "answers must be a two-element array" },
      { status: 400 }
    );
  }

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }
  const user = await prisma.user.findUnique({ where: { id: task.userId } });
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const { multiplier, verdict } = await verifyCompletion(
    { title: task.title, difficulty: task.difficulty as 1 | 2 | 3 },
    [answers[0], answers[1]]
  );

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const earnedTodayAgg = await prisma.pointsLedger.aggregate({
    where: { userId: user.id, createdAt: { gte: startOfToday } },
    _sum: { amount: true },
  });

  const { points, cappedByDailyLimit } = calculatePoints({
    difficulty: task.difficulty as 1 | 2 | 3,
    multiplier,
    streak: user.streak,
    pointsEarnedToday: earnedTodayAgg._sum.amount ?? 0,
  });

  await prisma.$transaction([
    prisma.task.update({
      where: { id: task.id },
      data: { status: "done", completedAt: new Date() },
    }),
    prisma.checkIn.create({
      data: {
        taskId: task.id,
        answers: JSON.stringify(answers),
        verdict,
        multiplier,
      },
    }),
    prisma.pointsLedger.create({
      data: {
        userId: user.id,
        amount: points,
        reason: "task-complete",
        taskId: task.id,
      },
    }),
  ]);

  return NextResponse.json({
    pointsAwarded: points,
    multiplier,
    verdict,
    cappedByDailyLimit,
  });
}
