import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/tts";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const { text } = body;

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const audio = await synthesizeSpeech(text);
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // Labeled fallback per DISCLOSURES.md — voice is optional, never faked.
    console.error("tts unavailable:", err);
    return NextResponse.json({ error: "voice offline" }, { status: 503 });
  }
}
