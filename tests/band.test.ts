import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBandGoalRoom,
  requestGoalReflection,
  sendBandRoomMessage,
} from "../src/lib/band";

// Acceptance criteria from prompts/band_typescript.prompt — no real network:
// fetch is stubbed to play the Band Agent API's { data: T } envelope.

function stubBand(...payloads: unknown[]) {
  const queue = [...payloads];
  const fn = vi.fn(async () => ({
    ok: true,
    json: async () => ({ data: queue.shift() ?? {} }),
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.BAND_COACH_API_KEY;
  delete process.env.BAND_REFLECTION_AGENT_ID;
});

describe("createBandGoalRoom", () => {
  it("creates the chat then adds the reflection agent, returning the room id", async () => {
    process.env.BAND_COACH_API_KEY = "band_test";
    process.env.BAND_REFLECTION_AGENT_ID = "agent-r";
    const fn = stubBand({ id: "room-1" }, {});

    const roomId = await createBandGoalRoom("Run every day");

    expect(roomId).toBe("room-1");
    const [firstUrl, firstInit] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(firstUrl).toBe("https://app.band.ai/api/v1/agent/chats");
    expect((firstInit.headers as Record<string, string>)["X-API-Key"]).toBe("band_test");
    const [secondUrl, secondInit] = fn.mock.calls[1] as unknown as [string, RequestInit];
    expect(secondUrl).toBe("https://app.band.ai/api/v1/agent/chats/room-1/participants");
    expect(JSON.parse(secondInit.body as string).participant.participant_id).toBe("agent-r");
  });

  it("throws a named error when BAND_REFLECTION_AGENT_ID is unset", async () => {
    process.env.BAND_COACH_API_KEY = "band_test";
    stubBand({ id: "room-1" });
    await expect(createBandGoalRoom("x")).rejects.toThrow(
      "BAND_REFLECTION_AGENT_ID not set"
    );
  });
});

describe("sendBandRoomMessage", () => {
  it("posts content and mentions in Band's message envelope", async () => {
    process.env.BAND_COACH_API_KEY = "band_test";
    const fn = stubBand({});
    await sendBandRoomMessage({ roomId: "room-9", content: "hi", mentions: ["a1"] });

    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://app.band.ai/api/v1/agent/chats/room-9/messages");
    expect(JSON.parse(init.body as string)).toEqual({
      message: { content: "hi", mentions: ["a1"] },
    });
  });

  it("throws a named error when BAND_COACH_API_KEY is unset", async () => {
    await expect(
      sendBandRoomMessage({ roomId: "r", content: "x", mentions: [] })
    ).rejects.toThrow("BAND_COACH_API_KEY not set");
  });

  it("surfaces non-OK Band responses with the HTTP status", async () => {
    process.env.BAND_COACH_API_KEY = "band_test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" }))
    );
    await expect(
      sendBandRoomMessage({ roomId: "r", content: "x", mentions: [] })
    ).rejects.toThrow("Band API error 500");
  });
});

describe("requestGoalReflection", () => {
  it("sends pure-JSON content with goalId and checkInId, mentioning the agent", async () => {
    process.env.BAND_COACH_API_KEY = "band_test";
    process.env.BAND_REFLECTION_AGENT_ID = "agent-r";
    const fn = stubBand({});

    await requestGoalReflection({ roomId: "room-2", goalId: "g1", checkInId: "c1" });

    const [, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    const message = JSON.parse(init.body as string).message;
    expect(message.mentions).toEqual(["agent-r"]);
    expect(JSON.parse(message.content)).toEqual({ goalId: "g1", checkInId: "c1" });
  });

  it("throws a named error when BAND_REFLECTION_AGENT_ID is unset", async () => {
    process.env.BAND_COACH_API_KEY = "band_test";
    await expect(
      requestGoalReflection({ roomId: "r", goalId: "g", checkInId: "c" })
    ).rejects.toThrow("BAND_REFLECTION_AGENT_ID not set");
  });
});
