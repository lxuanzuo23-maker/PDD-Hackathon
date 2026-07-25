import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const XP_PER_LEVEL = 50;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({ error: "no demo user — run npm run seed" }, { status: 500 });
  }

  const item = await prisma.rewardItem.findUnique({ where: { id: params.id } });
  if (!item) {
    return NextResponse.json({ error: "reward item not found" }, { status: 404 });
  }

  const ledgerAgg = await prisma.pointsLedger.aggregate({
    where: { userId: user.id },
    _sum: { amount: true },
  });
  const balance = ledgerAgg._sum.amount ?? 0;

  if (balance < item.cost) {
    return NextResponse.json({ ok: false, error: "not enough points" }, { status: 400 });
  }

  const companion = await prisma.companionState.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const newXp = companion.xp + item.cost;
  const newLevel = 1 + Math.floor(newXp / XP_PER_LEVEL);

  const [, , updatedCompanion] = await prisma.$transaction([
    prisma.pointsLedger.create({
      data: { userId: user.id, amount: -item.cost, reason: "redemption" },
    }),
    prisma.redemption.create({
      data: { userId: user.id, rewardItemId: item.id },
    }),
    prisma.companionState.update({
      where: { userId: user.id },
      data: { xp: newXp, level: newLevel },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    newBalance: balance - item.cost,
    companionState: updatedCompanion,
  });
}
