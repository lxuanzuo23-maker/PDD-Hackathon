import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { longestStreak, buildRunningBalance } from "@/lib/growth";
import type { GrowthResponse, GrowthPoint } from "@/lib/contract";

// Reads live ledger/check-in history — must not be statically cached.
export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

function toUTCDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET() {
  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json(
      { error: "no demo user — run npm run seed" },
      { status: 500 }
    );
  }

  const today = startOfUTCDay(new Date());
  const windowStart = new Date(today);
  windowStart.setUTCDate(windowStart.getUTCDate() - (WINDOW_DAYS - 1));
  const userStart = startOfUTCDay(user.createdAt);
  // Don't report before the account existed, but cap the window so old
  // accounts don't return an ever-growing array.
  const rangeStart = userStart > windowStart ? userStart : windowStart;

  const days: string[] = [];
  for (
    let d = new Date(rangeStart);
    d.getTime() <= today.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    days.push(toUTCDateString(d));
  }

  const [allLedgerRows, checkIns, penaltyRows] = await Promise.all([
    prisma.pointsLedger.findMany({
      where: { userId: user.id },
      select: { amount: true, createdAt: true },
    }),
    prisma.checkIn.findMany({
      where: { goal: { userId: user.id } },
      select: { createdAt: true },
    }),
    prisma.pointsLedger.findMany({
      where: { userId: user.id, reason: "penalty" },
      select: { createdAt: true },
    }),
  ]);

  // Starting balance = everything before the reported window, so the
  // first point on the graph reflects true history instead of resetting
  // to zero.
  const startingBalance = allLedgerRows
    .filter((r) => r.createdAt < rangeStart)
    .reduce((sum, r) => sum + r.amount, 0);

  const dailyEntries = allLedgerRows
    .filter((r) => r.createdAt >= rangeStart)
    .map((r) => ({ date: toUTCDateString(r.createdAt), amount: r.amount }));

  const balances = buildRunningBalance(dailyEntries, days, startingBalance);

  const checkedInDays = new Set(checkIns.map((c) => toUTCDateString(c.createdAt)));
  // Simplification (disclosed): a missed-day penalty is dated to whenever
  // the lazy check ran, not the actual missed calendar day — so a return
  // visit after several missed days will show them all clustered on the
  // day the app was reopened, not spread across the days actually missed.
  const penalizedDays = new Set(penaltyRows.map((p) => toUTCDateString(p.createdAt)));

  const points: GrowthPoint[] = days.map((date, i) => ({
    date,
    pointsBalance: balances[i],
    checkedIn: checkedInDays.has(date),
    missed: penalizedDays.has(date),
  }));

  const response: GrowthResponse = {
    points,
    currentStreak: user.streak,
    longestStreak: longestStreak(Array.from(checkedInDays)),
  };

  return NextResponse.json(response);
}
