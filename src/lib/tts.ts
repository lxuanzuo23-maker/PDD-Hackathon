/**
 * tts.ts — the ONE place TinyWins talks to ElevenLabs.
 *
 * Voice is an enhancement on the 2-minute-start card, never a dependency:
 * callers must treat any failure here as a labeled "voice offline" state
 * (per DISCLOSURES.md), and the demo arc must work with this module dark.
 */

const MAX_TEXT_LENGTH = 300;

// Rehearsals replay the same pep talk — one API call per unique text.
const audioCache = new Map<string, ArrayBuffer>();

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const capped = text.trim().slice(0, MAX_TEXT_LENGTH);
  const cached = audioCache.get(capped);
  if (cached) return cached;

  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: capped,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
  }

  const audio = await res.arrayBuffer();
  audioCache.set(capped, audio);
  return audio;
}
