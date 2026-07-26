import { describe, it, expect, vi, beforeEach } from "vitest";

const chatJSON = vi.fn();
vi.mock("@/lib/llm", () => ({
  chatJSON: (...args: unknown[]) => chatJSON(...args),
}));

const { handleCoachMessage } = await import("../src/lib/coach");

const goal = { title: "Clean the kitchen", difficulty: 2 as const };

describe("handleCoachMessage", () => {
  beforeEach(() => {
    chatJSON.mockReset();
  });

  it("returns the nested microStep shape the UI reads", async () => {
    chatJSON.mockResolvedValue({
      reply: "That sounds heavy. Start tiny.",
      microStep: { description: "Put 5 dishes in the sink.", timerSeconds: 120 },
    });

    const result = await handleCoachMessage("I'm stuck", goal);
    expect(result.microStep).toEqual({
      description: "Put 5 dishes in the sink.",
      timerSeconds: 120,
    });
  });

  it("normalizes a flat string microStep into the nested shape", async () => {
    // Models drift back to the flatter form; losing the micro-step would
    // cost the user the most valuable part of the reply.
    chatJSON.mockResolvedValue({
      reply: "One small move.",
      microStep: "Put 5 dishes in the sink.",
      timerSeconds: 90,
    });

    const result = await handleCoachMessage("I'm stuck", goal);
    expect(result.microStep).toEqual({
      description: "Put 5 dishes in the sink.",
      timerSeconds: 90,
    });
  });

  it("defaults timerSeconds to 120 when the model omits it", async () => {
    chatJSON.mockResolvedValue({
      reply: "Try this.",
      microStep: { description: "Open the doc." },
    });

    const result = await handleCoachMessage("I'm stuck", goal);
    expect(result.microStep?.timerSeconds).toBe(120);
  });

  it("does not fabricate a microStep for plain chat with no goal", async () => {
    chatJSON.mockResolvedValue({ reply: "Hey — how's today going?" });

    const result = await handleCoachMessage("hello", null);
    expect(result.microStep).toBeUndefined();
    expect(result.reply).toBe("Hey — how's today going?");
  });

  it("drops an empty micro-step description rather than rendering a blank card", async () => {
    chatJSON.mockResolvedValue({ reply: "Hi", microStep: { description: "   " } });

    const result = await handleCoachMessage("hello", null);
    expect(result.microStep).toBeUndefined();
  });

  it("passes the traits profile into the system prompt", async () => {
    chatJSON.mockResolvedValue({ reply: "ok" });

    await handleCoachMessage("hi", goal, {
      communicationStyle: "playful",
      motivationStyle: "achievement",
    });

    const messages = chatJSON.mock.calls[0][0] as { role: string; content: string }[];
    expect(messages[0].content).toContain("playful");
    expect(messages[0].content).toContain("achievement");
  });

  it("asks about changing approach after repeated curt replies", async () => {
    chatJSON.mockResolvedValue({ reply: "ok" });

    await handleCoachMessage("fine", goal, { recentCurtReplies: 2 });

    const messages = chatJSON.mock.calls[0][0] as { role: string; content: string }[];
    expect(messages[0].content).toContain("change my approach");
  });

  it("lowers intensity quietly on a single curt reply, without calling it out", async () => {
    chatJSON.mockResolvedValue({ reply: "ok" });

    await handleCoachMessage("k", goal, { recentCurtReplies: 1 });

    const messages = chatJSON.mock.calls[0][0] as { role: string; content: string }[];
    expect(messages[0].content).toContain("do not call attention to it");
    expect(messages[0].content).not.toContain("change my approach");
  });

  it("surfaces showApproachCheckIn when the model sets it", async () => {
    chatJSON.mockResolvedValue({ reply: "Want me to change my approach?", showApproachCheckIn: true });

    const result = await handleCoachMessage("whatever", goal, { recentCurtReplies: 2 });
    expect(result.showApproachCheckIn).toBe(true);
  });

  it("never emits shaming language from its own prompt", async () => {
    chatJSON.mockResolvedValue({ reply: "ok" });

    await handleCoachMessage("hi", goal);

    const messages = chatJSON.mock.calls[0][0] as { role: string; content: string }[];
    expect(messages[0].content).toContain("Never shame");
  });
});
