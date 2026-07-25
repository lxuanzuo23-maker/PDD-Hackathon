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
    prisma.companionState.findUnique({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ items, companionState: companion });
}
