import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildLook, summarizeOwned, type RedeemedItem } from "@/lib/look";
import { XP_PER_LEVEL } from "@/lib/contract";
import type { CompanionMood, RedeemResponse } from "@/lib/contract";

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
  const leveledUp = newLevel > companion.level;

  const [, , updatedCompanion] = await prisma.$transaction([
    prisma.pointsLedger.create({
      data: { userId: user.id, amount: -item.cost, reason: "redemption" },
    }),
    prisma.redemption.create({
      data: { userId: user.id, rewardItemId: item.id },
    }),
    prisma.companionState.update({
      where: { userId: user.id },
      data: {
        xp: newXp,
        level: newLevel,
        // A level-up is the companion's proudest moment — reflect it in its
        // mood rather than leaving the face unchanged.
        ...(leveledUp ? { mood: "proud" } : {}),
      },
    }),
  ]);

  // Re-read redemptions after the write so the returned look includes the
  // item just bought — the whole point is that spending changes the avatar.
  const redemptions = await prisma.redemption.findMany({
    where: { userId: user.id },
    include: { rewardItem: true },
  });
  const redeemed: RedeemedItem[] = redemptions.map((r) => ({
    rewardItemId: r.rewardItemId,
    kind: r.rewardItem.kind,
    emoji: r.rewardItem.emoji,
    themeKey: r.rewardItem.themeKey,
    redeemedAt: r.createdAt,
  }));

  const response: RedeemResponse = {
    ok: true,
    newBalance: balance - item.cost,
    companion: {
      level: updatedCompanion.level,
      xp: updatedCompanion.xp,
      mood: updatedCompanion.mood as CompanionMood,
    },
    owned: summarizeOwned(redeemed),
    look: buildLook(redeemed),
    leveledUp,
  };

  return NextResponse.json(response);
}
