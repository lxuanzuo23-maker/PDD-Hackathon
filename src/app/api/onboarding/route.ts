import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildInitialTraits, analyzeVisionBoard } from "@/lib/traits";
import type { Mood, OnboardingResponse } from "@/lib/contract";

// NOTE: imports src/lib/traits.ts, which is Person C's module (see
// prompts/traits_typescript.prompt). Until that file exists this route
// won't compile — expected during parallel work.

const VALID_MOODS: Mood[] = ["rough", "low", "okay", "good", "great"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches the UI's 5MB client check
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function getDemoUser() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No demo user found — did you run `npm run seed`?");
  return user;
}

/**
 * POST /api/onboarding — multipart FormData (not JSON), because it carries
 * the vision board image file. Fields: age, gender, habitToImprove,
 * newHabitGoal, mood, visionBoard?
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart form submission." },
      { status: 400 }
    );
  }

  const ageRaw = String(form.get("age") ?? "").trim();
  const gender = String(form.get("gender") ?? "").trim();
  const habitToImprove = String(form.get("habitToImprove") ?? "").trim();
  const newHabitGoal = String(form.get("newHabitGoal") ?? "").trim();
  const mood = String(form.get("mood") ?? "").trim() as Mood;
  const visionBoard = form.get("visionBoard");

  const age = Number(ageRaw);
  if (!Number.isInteger(age) || age < 13 || age > 120) {
    return NextResponse.json(
      { error: "Enter an age between 13 and 120." },
      { status: 400 }
    );
  }
  if (!gender) {
    return NextResponse.json({ error: "Choose or describe your gender." }, { status: 400 });
  }
  if (!VALID_MOODS.includes(mood)) {
    return NextResponse.json({ error: "Choose how today feels." }, { status: 400 });
  }

  // Validate the image before any LLM work so a bad upload fails fast.
  let imageDataUrl: string | undefined;
  if (visionBoard instanceof File && visionBoard.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(visionBoard.type)) {
      return NextResponse.json(
        { error: "Choose a JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }
    if (visionBoard.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Vision boards must be 5 MB or smaller." },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await visionBoard.arrayBuffer());
    // Stored inline as a data URL: SQLite is already the disclosed
    // ephemeral store, and this avoids standing up file hosting for a demo.
    imageDataUrl = `data:${visionBoard.type};base64,${buffer.toString("base64")}`;
  }

  const user = await getDemoUser();
  const baseProfile = buildInitialTraits({ age, gender, mood });

  let visionBoardThemes: string[] = [];
  let analysisStatus: OnboardingResponse["analysisStatus"] = "complete";
  if (imageDataUrl) {
    // analyzeVisionBoard is contracted never to throw — it returns
    // { themes: [] } when the provider can't do images or the call fails.
    const analysis = await analyzeVisionBoard(imageDataUrl);
    visionBoardThemes = analysis.themes;
    // Report honestly rather than claiming success on an empty analysis.
    if (visionBoardThemes.length === 0) analysisStatus = "unavailable";
  }

  const traitFields = {
    age,
    gender,
    habitToImprove: habitToImprove || null,
    newHabitGoal: newHabitGoal || null,
    visionBoardImageUrl: imageDataUrl ?? null,
    visionBoardThemes: JSON.stringify(visionBoardThemes),
    communicationStyle: baseProfile.communicationStyle,
    motivationStyle: baseProfile.motivationStyle,
  };

  await prisma.userTraits.upsert({
    where: { userId: user.id },
    update: traitFields,
    create: { userId: user.id, ...traitFields },
  });

  await prisma.moodCheckIn.create({
    data: { userId: user.id, mood },
  });

  const response: OnboardingResponse = {
    ...(imageDataUrl ? { imageUrl: imageDataUrl } : {}),
    analysisStatus,
  };

  return NextResponse.json(response);
}
