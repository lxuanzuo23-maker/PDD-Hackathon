import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reads live companion state — must not be statically cached at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({ error: "no demo user — run npm run seed" }, { status: 500 });
  }

  const [items, companion] = await Promise.all([
    prisma.rewardItem.findMany(),
    prisma.companionState.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    }),
  ]);

  const ledgerAgg = await prisma.pointsLedger.aggregate({
    where: { userId: user.id },
    _sum: { amount: true },
  });

  return NextResponse.json({
    items,
    companion,
    pointsBalance: ledgerAgg._sum.amount ?? 0,
  });
}
