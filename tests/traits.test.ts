import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildInitialTraits,
  analyzeVisionBoard,
  updateTraitsFromCheckIn,
} from "../src/lib/traits";
import type { TraitsProfile } from "../src/lib/contract";

describe("buildInitialTraits", () => {
  it("returns every field and an empty theme list", () => {
    const profile = buildInitialTraits({ age: 30, gender: "female", mood: "okay" });
    expect(profile).toEqual({
      age: 30,
      gender: "female",
      communicationStyle: "direct",
      motivationStyle: "achievement",
      visionBoardThemes: [],
      currentMood: "okay",
    });
  });

  it("biases toward gentleness when the user is having a rough day", () => {
    const profile = buildInitialTraits({ age: 40, gender: "male", mood: "rough" });
    expect(profile.communicationStyle).toBe("encouraging");
    expect(profile.motivationStyle).toBe("support");
  });

  it("does not override a low mood just because the user is young", () => {
    const profile = buildInitialTraits({ age: 19, gender: "non-binary", mood: "low" });
    expect(profile.communicationStyle).toBe("encouraging");
  });

  it("uses a playful register for younger users in a good mood", () => {
    const profile = buildInitialTraits({ age: 19, gender: "non-binary", mood: "great" });
    expect(profile.communicationStyle).toBe("playful");
  });
});

describe("analyzeVisionBoard", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.LLM_PROVIDER = "tokenrouter";
    process.env.TOKENROUTER_API_KEY = "tr_test";
    delete process.env.ROCKETRIDE_URI;
    delete process.env.ROCKETRIDE_AUTH;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function stubReply(content: string) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content } }] }),
    }) as unknown as typeof fetch;
  }

  it("extracts, lowercases, and caps themes at five", async () => {
    stubReply(
      JSON.stringify({ themes: ["Fitness", " Travel ", "career growth", "d", "e", "f"] })
    );
    const result = await analyzeVisionBoard("data:image/png;base64,AAAA");
    expect(result.themes).toEqual(["fitness", "travel", "career growth", "d", "e"]);
  });

  it("returns no themes instead of throwing when the provider fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("provider exploded")) as unknown as typeof fetch;
    await expect(analyzeVisionBoard("data:image/png;base64,AAAA")).resolves.toEqual({
      themes: [],
    });
  });

  it("returns no themes when the reply is not valid JSON", async () => {
    stubReply("I'm afraid I can't look at images.");
    await expect(analyzeVisionBoard("data:image/png;base64,AAAA")).resolves.toEqual({
      themes: [],
    });
  });

  it("returns no themes when the key is missing, without throwing", async () => {
    delete process.env.TOKENROUTER_API_KEY;
    await expect(analyzeVisionBoard("data:image/png;base64,AAAA")).resolves.toEqual({
      themes: [],
    });
  });
});

describe("updateTraitsFromCheckIn", () => {
  const base: TraitsProfile = {
    age: 30,
    gender: "female",
    communicationStyle: "direct",
    motivationStyle: "achievement",
    visionBoardThemes: ["fitness"],
    currentMood: "okay",
  };

  it("shifts toward support when answers are terse", () => {
    const next = updateTraitsFromCheckIn(base, {
      answerLengths: [4, 6],
      verdict: "partial",
    });
    expect(next.communicationStyle).toBe("encouraging");
    expect(next.motivationStyle).toBe("support");
  });

  it("shifts toward achievement on long accepted answers", () => {
    const next = updateTraitsFromCheckIn(
      { ...base, communicationStyle: "encouraging", motivationStyle: "support" },
      { answerLengths: [120, 95], verdict: "accepted" }
    );
    expect(next.communicationStyle).toBe("direct");
    expect(next.motivationStyle).toBe("achievement");
  });

  it("leaves the profile alone for mid-length answers", () => {
    expect(updateTraitsFromCheckIn(base, { answerLengths: [50], verdict: "accepted" })).toEqual(base);
  });

  it("leaves the profile alone when there is no signal", () => {
    expect(updateTraitsFromCheckIn(base, { answerLengths: [], verdict: "accepted" })).toEqual(base);
  });

  it("is pure — same input, same output, and never mutates the original", () => {
    const signal = { answerLengths: [4], verdict: "partial" as const };
    const first = updateTraitsFromCheckIn(base, signal);
    const second = updateTraitsFromCheckIn(base, signal);
    expect(first).toEqual(second);
    expect(base.communicationStyle).toBe("direct");
  });

  it("preserves vision board themes it did not compute", () => {
    const next = updateTraitsFromCheckIn(base, { answerLengths: [4], verdict: "partial" });
    expect(next.visionBoardThemes).toEqual(["fitness"]);
  });
});
