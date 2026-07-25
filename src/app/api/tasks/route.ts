import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// No real auth in this demo — one seeded user, per DISCLOSURES.md.
async function getDemoUser() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No demo user found — did you run `npm run seed`?");
  return user;
}

export async function GET() {
  const user = await getDemoUser();

  const [tasks, ledger] = await Promise.all([
    prisma.task.findMany({
      where: { userId: user.id, status: "open" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pointsLedger.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json({
    tasks,
    streak: user.streak,
    pointsBalance: ledger._sum.amount ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, difficulty } = body as { title?: string; difficulty?: number };

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof difficulty !== "number" || ![1, 2, 3].includes(difficulty)) {
    return NextResponse.json({ error: "difficulty must be 1, 2, or 3" }, { status: 400 });
  }

  const user = await getDemoUser();
  const task = await prisma.task.create({
    data: { userId: user.id, title, difficulty },
  });

  return NextResponse.json(task, { status: 201 });
}
