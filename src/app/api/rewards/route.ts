import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildLook, summarizeOwned, type RedeemedItem } from "@/lib/look";
import type { CompanionMood, RewardKind, RewardsResponse } from "@/lib/contract";

// Reads live companion state — must not be statically cached at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({ error: "no demo user — run npm run seed" }, { status: 500 });
  }

  const [items, companion, redemptions, ledgerAgg] = await Promise.all([
    prisma.rewardItem.findMany({ orderBy: { cost: "asc" } }),
    prisma.companionState.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    }),
    prisma.redemption.findMany({
      where: { userId: user.id },
      include: { rewardItem: true },
    }),
    prisma.pointsLedger.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),
  ]);

  const redeemed: RedeemedItem[] = redemptions.map((r) => ({
    rewardItemId: r.rewardItemId,
    kind: r.rewardItem.kind,
    emoji: r.rewardItem.emoji,
    themeKey: r.rewardItem.themeKey,
    redeemedAt: r.createdAt,
  }));

  const response: RewardsResponse = {
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      cost: item.cost,
      kind: item.kind as RewardKind,
      emoji: item.emoji,
    })),
    companion: {
      level: companion.level,
      xp: companion.xp,
      mood: companion.mood as CompanionMood,
    },
    pointsBalance: ledgerAgg._sum.amount ?? 0,
    owned: summarizeOwned(redeemed),
    look: buildLook(redeemed),
  };

  return NextResponse.json(response);
}
