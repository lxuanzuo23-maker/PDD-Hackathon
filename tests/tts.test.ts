import { afterEach, describe, expect, it, vi } from "vitest";
import { synthesizeSpeech } from "../src/lib/tts";

// Acceptance criteria from prompts/tts_typescript.prompt — no real network:
// fetch is stubbed to play ElevenLabs. The module caches by text, so each
// test uses distinct text to stay independent.

function stubFetchAudio(byteLength = 8) {
  const fn = vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(byteLength),
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_VOICE_ID;
  delete process.env.ELEVENLABS_MODEL_ID;
});

describe("synthesizeSpeech", () => {
  it("throws a named error when ELEVENLABS_API_KEY is unset", async () => {
    await expect(synthesizeSpeech("hello")).rejects.toThrow(
      "ELEVENLABS_API_KEY not set"
    );
  });

  it("sends xi-api-key, text, and model_id to the voice endpoint", async () => {
    process.env.ELEVENLABS_API_KEY = "el_test";
    process.env.ELEVENLABS_VOICE_ID = "voice123";
    process.env.ELEVENLABS_MODEL_ID = "model_x";
    const fn = stubFetchAudio();

    await synthesizeSpeech("you can do two minutes");

    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/voice123");
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe(
      "el_test"
    );
    const body = JSON.parse(init.body as string);
    expect(body.text).toBe("you can do two minutes");
    expect(body.model_id).toBe("model_x");
  });

  it("returns the audio bytes on success", async () => {
    process.env.ELEVENLABS_API_KEY = "el_test";
    stubFetchAudio(16);
    const audio = await synthesizeSpeech("five dishes in the sink");
    expect(audio.byteLength).toBe(16);
  });

  it("surfaces upstream failures with the HTTP status", async () => {
    process.env.ELEVENLABS_API_KEY = "el_test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => "bad key",
      }))
    );
    await expect(synthesizeSpeech("start the laundry")).rejects.toThrow(
      "ElevenLabs error 401"
    );
  });

  it("serves a repeated pep talk from cache with one upstream call", async () => {
    process.env.ELEVENLABS_API_KEY = "el_test";
    const fn = stubFetchAudio();
    await synthesizeSpeech("walk for ten minutes");
    await synthesizeSpeech("walk for ten minutes");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
