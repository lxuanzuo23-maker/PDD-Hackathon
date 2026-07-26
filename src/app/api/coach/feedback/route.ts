import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CoachFeedbackRequest, TraitsProfile } from "@/lib/contract";

/**
 * POST /api/coach/feedback — the user's answer to "want me to change my
 * approach?". This is the one place the user gets to directly overrule the
 * trait heuristics, so it writes straight to the stored profile.
 *
 * "unchanged" is recorded as a no-op rather than an error: the user
 * declining a change is a valid answer, not a failure.
 */
const APPROACH_TO_STYLE: Record<
  "direct" | "gentle",
  TraitsProfile["communicationStyle"]
> = {
  direct: "direct",
  gentle: "encouraging",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { approach } = body as Partial<CoachFeedbackRequest>;

  if (approach !== "direct" && approach !== "gentle" && approach !== "unchanged") {
    return NextResponse.json(
      { error: "approach must be 'direct', 'gentle', or 'unchanged'" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json(
      { error: "no demo user — run npm run seed" },
      { status: 500 }
    );
  }

  if (approach === "unchanged") {
    return NextResponse.json({ ok: true });
  }

  const traits = await prisma.userTraits.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  // Only update an existing profile. Creating one here would need age and
  // gender we don't have, and silently inventing them would corrupt the
  // profile the user filled in during onboarding.
  if (!traits) {
    return NextResponse.json(
      { error: "no profile yet — complete onboarding first" },
      { status: 409 }
    );
  }

  await prisma.userTraits.update({
    where: { userId: user.id },
    data: { communicationStyle: APPROACH_TO_STYLE[approach] },
  });

  return NextResponse.json({ ok: true });
}
