import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildInitialTraits, analyzeVisionBoard } from "@/lib/traits";
import type {
  OnboardingRequest,
  OnboardingResponse,
  OnboardingStatusResponse,
  TraitsProfile,
  Mood,
} from "@/lib/contract";

// NOTE: this route imports src/lib/traits.ts, which is Person C's module
// (see prompts/traits_typescript.prompt). It won't compile until that
// file exists — expected during parallel work, not a bug in this route.

const VALID_MOODS: Mood[] = ["rough", "low", "okay", "good", "great"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // ~2MB decoded, see prompt

async function getDemoUser() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No demo user found — did you run `npm run seed`?");
  return user;
}

function decodedBase64Size(dataUrl: string): number {
  const base64 = dataUrl.split(",").pop() ?? "";
  // Each base64 char encodes 6 bits; padding chars don't count toward size.
  const padding = (base64.match(/=+$/) ?? [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function GET() {
  const user = await getDemoUser();
  const traits = await prisma.userTraits.findUnique({ where: { userId: user.id } });

  if (!traits) {
    const response: OnboardingStatusResponse = { completed: false };
    return NextResponse.json(response);
  }

  const profile: TraitsProfile = {
    age: traits.age,
    gender: traits.gender,
    communicationStyle: traits.communicationStyle as TraitsProfile["communicationStyle"],
    motivationStyle: traits.motivationStyle as TraitsProfile["motivationStyle"],
    visionBoardThemes: traits.visionBoardThemes ? JSON.parse(traits.visionBoardThemes) : [],
    currentMood: "okay", // most recent mood is tracked via MoodCheckIn, not restated here
  };

  const response: OnboardingStatusResponse = { completed: true, traits: profile };
  return NextResponse.json(response);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { age, gender, habitToImprove, newHabitGoal, visionBoardImage, mood } =
    body as Partial<OnboardingRequest>;

  if (typeof age !== "number" || age < 13 || age > 120) {
    return NextResponse.json(
      { error: "age must be a number between 13 and 120" },
      { status: 400 }
    );
  }
  if (!gender || typeof gender !== "string") {
    return NextResponse.json({ error: "gender is required" }, { status: 400 });
  }
  if (!mood || !VALID_MOODS.includes(mood)) {
    return NextResponse.json(
      { error: `mood must be one of: ${VALID_MOODS.join(", ")}` },
      { status: 400 }
    );
  }
  if (visionBoardImage && decodedBase64Size(visionBoardImage) > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "image too large" }, { status: 400 });
  }

  const user = await getDemoUser();

  const baseProfile = buildInitialTraits({ age, gender, mood });

  let visionBoardThemes: string[] = [];
  if (visionBoardImage) {
    // analyzeVisionBoard is documented to never throw — it returns
    // { themes: [] } on any failure or unsupported provider, so no
    // try/catch is needed here per its own contract.
    const analysis = await analyzeVisionBoard(visionBoardImage);
    visionBoardThemes = analysis.themes;
  }

  const traits = await prisma.userTraits.upsert({
    where: { userId: user.id },
    update: {
      age,
      gender,
      habitToImprove: habitToImprove?.trim() || null,
      newHabitGoal: newHabitGoal?.trim() || null,
      visionBoardImageUrl: visionBoardImage ?? null,
      visionBoardThemes: JSON.stringify(visionBoardThemes),
      communicationStyle: baseProfile.communicationStyle,
      motivationStyle: baseProfile.motivationStyle,
    },
    create: {
      userId: user.id,
      age,
      gender,
      habitToImprove: habitToImprove?.trim() || null,
      newHabitGoal: newHabitGoal?.trim() || null,
      visionBoardImageUrl: visionBoardImage ?? null,
      visionBoardThemes: JSON.stringify(visionBoardThemes),
      communicationStyle: baseProfile.communicationStyle,
      motivationStyle: baseProfile.motivationStyle,
    },
  });

  await prisma.moodCheckIn.create({
    data: { userId: user.id, mood },
  });

  const profile: TraitsProfile = {
    age: traits.age,
    gender: traits.gender,
    communicationStyle: traits.communicationStyle as TraitsProfile["communicationStyle"],
    motivationStyle: traits.motivationStyle as TraitsProfile["motivationStyle"],
    visionBoardThemes,
    currentMood: mood,
  };

  const response: OnboardingResponse = { traits: profile };
  return NextResponse.json(response);
}
