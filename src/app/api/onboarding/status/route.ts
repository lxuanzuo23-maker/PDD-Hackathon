import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { OnboardingStatusResponse } from "@/lib/contract";

export const dynamic = "force-dynamic";

/**
 * GET /api/onboarding/status — cheap "has this user onboarded yet" check,
 * used to bounce returning users straight past the quiz. Deliberately does
 * not return the full profile: the onboarding page only needs the boolean,
 * and the traits profile is internal to the coach.
 */
export async function GET() {
  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json(
      { error: "no demo user — run npm run seed" },
      { status: 500 }
    );
  }

  const traits = await prisma.userTraits.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  const response: OnboardingStatusResponse = { completed: traits !== null };
  return NextResponse.json(response);
}
