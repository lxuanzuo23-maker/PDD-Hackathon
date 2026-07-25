/**
 * llm.ts — the ONE place TinyWins talks to an LLM.
 *
 * Every other module (coach, verifier) calls `chatJSON()` and never touches
 * a provider SDK directly. Swapping MiniMax for a fallback key is a 1-line
 * change: set LLM_PROVIDER in the environment.
 *
 * Action item from the design doc: verify MiniMax access in the first
 * 30 minutes of the build. If MINIMAX_API_KEY / MINIMAX_GROUP_ID aren't
 * working by T+0:30, switch LLM_PROVIDER to "openai" or "anthropic" and
 * move on — don't debug MiniMax auth mid-build.
 */

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type LLMProvider = "minimax" | "tokenrouter" | "openai" | "anthropic";

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Force a provider for this call; otherwise LLM_PROVIDER env var is used. */
  provider?: LLMProvider;
}

const DEFAULT_PROVIDER = (process.env.LLM_PROVIDER as LLMProvider) || "minimax";

/** Raw text completion. Structured callers should use chatJSON below. */
export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<string> {
  const provider = opts.provider ?? DEFAULT_PROVIDER;
  const temperature = opts.temperature ?? 0.4;
  const maxTokens = opts.maxTokens ?? 500;

  switch (provider) {
    case "minimax":
      return chatMiniMax(messages, temperature, maxTokens);
    case "tokenrouter":
      return chatTokenRouter(messages, temperature, maxTokens);
    case "openai":
      return chatOpenAI(messages, temperature, maxTokens);
    case "anthropic":
      return chatAnthropic(messages, temperature, maxTokens);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

/**
 * Calls chat(), then parses the response as JSON. Retries once with a
 * stricter "return ONLY JSON" instruction if the first parse fails —
 * this is the retry-once behavior the risk section asks for.
 */
export async function chatJSON<T>(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<T> {
  const raw = await chat(messages, opts);
  const parsed = tryParseJSON<T>(raw);
  if (parsed) return parsed;

  const retryMessages: ChatMessage[] = [
    ...messages,
    {
      role: "user",
      content:
        "Your previous reply was not valid JSON. Reply again with ONLY a single valid JSON object, no markdown fences, no commentary.",
    },
  ];
  const retryRaw = await chat(retryMessages, opts);
  const retryParsed = tryParseJSON<T>(retryRaw);
  if (retryParsed) return retryParsed;

  throw new Error(
    `LLM did not return valid JSON after retry. Last response: ${retryRaw.slice(0, 300)}`
  );
}

function tryParseJSON<T>(text: string): T | null {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

async function chatMiniMax(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;
  const model = process.env.MINIMAX_MODEL || "MiniMax-Text-01";
  if (!apiKey || !groupId) {
    throw new Error("MINIMAX_API_KEY / MINIMAX_GROUP_ID not set");
  }

  const res = await fetch(
    `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${groupId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`MiniMax error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("MiniMax returned no content");
  return content;
}

async function chatTokenRouter(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.TOKENROUTER_API_KEY;
  if (!apiKey) throw new Error("TOKENROUTER_API_KEY not set");

  // TokenRouter's current API is Responses-compatible. `auto:<mode>` lets it
  // select an upstream model (balance | cost | quality | latency).
  const res = await fetch("https://api.tokenrouter.io/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.TOKENROUTER_MODEL || "auto:balance",
      input: formatTokenRouterInput(messages),
      temperature,
      max_output_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    throw new Error(`TokenRouter error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { output_text?: unknown };
  const content = typeof data.output_text === "string" ? data.output_text : undefined;
  if (!content) throw new Error("TokenRouter returned no content");
  return content;
}

function formatTokenRouterInput(messages: ChatMessage[]): string {
  return messages
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join("\n\n");
}

async function chatOpenAI(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");
  return content;
}

async function chatAnthropic(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      system,
      messages: rest,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content = data?.content?.[0]?.text;
  if (!content) throw new Error("Anthropic returned no content");
  return content;
}
