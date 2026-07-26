/** The single integration point between TinyWins and LLM providers. */
export type LLMTextPart = { type: "text"; text: string };
export type LLMImagePart = {
  type: "image_url";
  imageUrl: string;
  detail?: "low" | "high" | "auto";
};
export type LLMContentPart = LLMTextPart | LLMImagePart;
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | LLMContentPart[];
};
export type LLMProvider = "minimax" | "tokenrouter" | "openai" | "anthropic";

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  provider?: LLMProvider;
}

/** Convenience helper for Vision Board analysis. */
export function imageMessage(prompt: string, imageUrl: string): ChatMessage {
  return {
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image_url", imageUrl, detail: "low" },
    ],
  };
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const provider = opts.provider ?? (process.env.LLM_PROVIDER as LLMProvider) ?? "minimax";
  const temperature = opts.temperature ?? 0.4;
  const maxTokens = opts.maxTokens ?? 500;
  switch (provider) {
    case "minimax": return chatMiniMax(messages, temperature, maxTokens);
    case "tokenrouter": return chatTokenRouter(messages, temperature, maxTokens);
    case "openai": return chatOpenAI(messages, temperature, maxTokens);
    case "anthropic": return chatAnthropic(messages, temperature, maxTokens);
    default: throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export async function chatJSON<T>(messages: ChatMessage[], opts: ChatOptions = {}): Promise<T> {
  const parsed = tryParseJSON<T>(await chat(messages, opts));
  if (parsed) return parsed;
  const retryRaw = await chat([...messages, {
    role: "user",
    content: "Your previous reply was not valid JSON. Reply again with ONLY a single valid JSON object, no markdown fences, no commentary.",
  }], opts);
  const retryParsed = tryParseJSON<T>(retryRaw);
  if (retryParsed) return retryParsed;
  throw new Error(`LLM did not return valid JSON after retry. Last response: ${retryRaw.slice(0, 300)}`);
}

function tryParseJSON<T>(text: string): T | null {
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()) as T; }
  catch { return null; }
}

function toOpenAICompatibleMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: typeof message.content === "string" ? message.content : message.content.map((part) =>
      part.type === "text"
        ? { type: "text", text: part.text }
        : { type: "image_url", image_url: { url: part.imageUrl, detail: part.detail ?? "auto" } }
    ),
  }));
}

async function postOpenAICompatible(
  endpoint: string, apiKey: string, providerName: string, model: string,
  messages: ChatMessage[], temperature: number, maxTokens: number
): Promise<string> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: toOpenAICompatibleMessages(messages), temperature, max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error(`${providerName} error ${res.status}: ${await res.text()}`);
  const content = (await res.json())?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) throw new Error(`${providerName} returned no text content`);
  return content;
}

async function chatMiniMax(messages: ChatMessage[], temperature: number, maxTokens: number) {
  const apiKey = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;
  if (!apiKey || !groupId) throw new Error("MINIMAX_API_KEY / MINIMAX_GROUP_ID not set");
  return postOpenAICompatible(`https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${groupId}`, apiKey, "MiniMax", process.env.MINIMAX_MODEL || "MiniMax-Text-01", messages, temperature, maxTokens);
}

async function chatTokenRouter(messages: ChatMessage[], temperature: number, maxTokens: number) {
  const apiKey = process.env.TOKENROUTER_API_KEY;
  if (!apiKey) throw new Error("TOKENROUTER_API_KEY not set");
  const configuredModel = process.env.TOKENROUTER_MODEL;
  const model = configuredModel && configuredModel !== "auto:balance" ? configuredModel : "google/gemini-3.5-flash-lite";
  return postOpenAICompatible("https://api.tokenrouter.com/v1/chat/completions", apiKey, "TokenRouter", model, messages, temperature, maxTokens);
}

async function chatOpenAI(messages: ChatMessage[], temperature: number, maxTokens: number) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return postOpenAICompatible("https://api.openai.com/v1/chat/completions", apiKey, "OpenAI", process.env.OPENAI_MODEL || "gpt-4o-mini", messages, temperature, maxTokens);
}

function toAnthropicContent(content: ChatMessage["content"]) {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type === "text") return { type: "text", text: part.text };
    const match = part.imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) throw new Error("Anthropic image input must be a base64 image data URL");
    return { type: "image", source: { type: "base64", media_type: match[1], data: match[2] } };
  });
}

async function chatAnthropic(messages: ChatMessage[], temperature: number, maxTokens: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const systemMessage = messages.find((message) => message.role === "system");
  if (systemMessage && typeof systemMessage.content !== "string") throw new Error("Anthropic system messages must be text-only");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      system: systemMessage?.content,
      messages: messages.filter((message) => message.role !== "system").map((message) => ({ role: message.role, content: toAnthropicContent(message.content) })),
      temperature, max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const content = (await res.json())?.content?.[0]?.text;
  if (!content) throw new Error("Anthropic returned no content");
  return content;
}
