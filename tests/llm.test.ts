import { afterEach, describe, expect, it, vi } from "vitest";
import { chat, chatJSON } from "../src/lib/llm";

// Acceptance criteria from prompts/llm_typescript.prompt — no real network:
// fetch is stubbed to play the provider.

function stubFetchReplies(...contents: string[]) {
  const queue = [...contents];
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        output_text: queue.shift() ?? "",
      }),
    }))
  );
}

const messages = [{ role: "user" as const, content: "hi" }];

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TOKENROUTER_API_KEY;
});

describe("chatJSON", () => {
  it("parses a clean JSON response on the first try", async () => {
    process.env.TOKENROUTER_API_KEY = "tr_test";
    stubFetchReplies('{"reply":"hello"}');
    const out = await chatJSON<{ reply: string }>(messages, {
      provider: "tokenrouter",
    });
    expect(out.reply).toBe("hello");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries once and succeeds when the reply is fenced in markdown", async () => {
    process.env.TOKENROUTER_API_KEY = "tr_test";
    // Fenced JSON is stripped by the parser, so force a real retry with
    // unparseable prose first, then valid JSON.
    stubFetchReplies("Sure! Here is your JSON: reply=hello", '{"reply":"hello"}');
    const out = await chatJSON<{ reply: string }>(messages, {
      provider: "tokenrouter",
    });
    expect(out.reply).toBe("hello");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws (not null) when both attempts fail to parse", async () => {
    process.env.TOKENROUTER_API_KEY = "tr_test";
    stubFetchReplies("not json", "still not json");
    await expect(
      chatJSON(messages, { provider: "tokenrouter" })
    ).rejects.toThrow(/valid JSON/);
  });
});

describe("chat provider selection", () => {
  it("uses TokenRouter's Responses endpoint and request shape", async () => {
    process.env.TOKENROUTER_API_KEY = "tr_test";
    stubFetchReplies("hello");

    await expect(chat(messages, { provider: "tokenrouter" })).resolves.toBe("hello");

    expect(fetch).toHaveBeenCalledWith("https://api.tokenrouter.io/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer tr_test",
      },
      body: JSON.stringify({
        model: "auto:balance",
        input: "USER:\nhi",
        temperature: 0.4,
        max_output_tokens: 500,
      }),
    });
  });

  it("throws a clear, named error when the selected provider's key is unset", async () => {
    await expect(
      chat(messages, { provider: "tokenrouter" })
    ).rejects.toThrow("TOKENROUTER_API_KEY not set");
  });

  it("rejects unknown providers loudly", async () => {
    await expect(
      // @ts-expect-error deliberately bad provider
      chat(messages, { provider: "carrier-pigeon" })
    ).rejects.toThrow("Unknown LLM provider");
  });
});
