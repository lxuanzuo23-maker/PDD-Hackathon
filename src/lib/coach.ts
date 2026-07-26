import { chatJSON } from "@/lib/llm";
import type { CoachChatResponse, TraitsProfile } from "@/lib/contract";

/**
 * The coach's reply shape is the frozen `CoachChatResponse` from
 * contract.ts — `microStep` is a nested object, not a bare string. It was
 * flat here originally, which meant the UI (reading
 * `microStep.description`) silently never rendered the 2-minute start card.
 */
export type CoachReply = CoachChatResponse;

/**
 * Subset of `TraitsProfile` the coach actually uses, plus a curtness
 * counter. Kept structurally compatible with `TraitsProfile` so the route
 * can pass the stored profile straight through.
 */
export interface CoachTraits {
  communicationStyle?: TraitsProfile["communicationStyle"] | string;
  motivationStyle?: TraitsProfile["motivationStyle"] | string;
  /**
   * How many of the user's recent replies read as curt. The caller owns
   * this: there is no server-side session store yet, so it is only set when
   * a caller can supply it (see TEAM_HANDOFF.md).
   */
  recentCurtReplies?: number;
}

const BASE_SYSTEM_PROMPT = `You are the AI coach inside TinyWins, an accountability app for people
who know what they need to do but can't start. You are warm, brief, and
never shaming. Your one job is to move the user from "stuck" to "doing"
as fast as possible.

If the user expresses being stuck or asks for help starting a goal, respond
with empathy in one short sentence, then propose exactly one concrete
micro-step that takes 2 minutes or less — small enough to start immediately
with zero setup ("put 5 dishes in the sink", not "clean the kitchen").

Never shame, lecture, or use guilt-based language. Never diagnose the
user's mental state. If there's no goal context and the user is just
chatting, reply naturally and omit microStep entirely.

Keep "reply" under 40 words.

Respond with ONLY a JSON object of the shape:
{"reply": string, "microStep"?: {"description": string, "timerSeconds": number}, "showApproachCheckIn"?: boolean}

When you propose a micro-step, "microStep.timerSeconds" is normally 120.
Set "showApproachCheckIn" to true ONLY on a reply where you are asking the
user whether they'd like you to change your approach.`;

function systemPromptFor(traits?: CoachTraits): string {
  if (!traits) return BASE_SYSTEM_PROMPT;
  const curtReplies = traits.recentCurtReplies ?? 0;
  const irritationGuidance =
    curtReplies >= 2
      ? 'The user has repeatedly sounded curt. Briefly and gently ask: "Want me to change my approach?" and set showApproachCheckIn to true. Do not ask more than once in a reply.'
      : curtReplies === 1
        ? "The user may be getting annoyed. Quietly reduce enthusiasm, questions, and emoji; do not call attention to it yet."
        : "";
  return `${BASE_SYSTEM_PROMPT}\n\nAdapt your tone to this user profile:\n- communication style: ${traits.communicationStyle || "encouraging"}\n- motivation style: ${traits.motivationStyle || "support"}\n${irritationGuidance}`;
}

/**
 * Coerces whatever the model returned into the frozen nested shape.
 *
 * Models drift back to the flat `{ microStep: "text", timerSeconds: 120 }`
 * form because it reads more naturally, so accept it and normalize rather
 * than dropping the micro-step on the floor — losing it costs the user the
 * single most valuable part of the reply.
 */
function normalizeReply(raw: unknown): CoachReply {
  const value = (raw ?? {}) as Record<string, unknown>;
  const reply = typeof value.reply === "string" ? value.reply : "";

  const result: CoachReply = { reply };

  const rawStep = value.microStep;
  const fallbackSeconds =
    typeof value.timerSeconds === "number" && value.timerSeconds > 0
      ? value.timerSeconds
      : 120;

  if (typeof rawStep === "string" && rawStep.trim()) {
    result.microStep = { description: rawStep.trim(), timerSeconds: fallbackSeconds };
  } else if (rawStep && typeof rawStep === "object") {
    const step = rawStep as Record<string, unknown>;
    const description =
      typeof step.description === "string" ? step.description.trim() : "";
    if (description) {
      const seconds =
        typeof step.timerSeconds === "number" && step.timerSeconds > 0
          ? step.timerSeconds
          : fallbackSeconds;
      result.microStep = { description, timerSeconds: seconds };
    }
  }

  if (value.showApproachCheckIn === true) result.showApproachCheckIn = true;

  return result;
}

export async function handleCoachMessage(
  message: string,
  goal: { title: string; difficulty: 1 | 2 | 3 } | null,
  traits?: CoachTraits
): Promise<CoachReply> {
  const goalContext = goal
    ? `The user is currently working on: "${goal.title}" (difficulty ${goal.difficulty}/3).`
    : "There is no specific goal in context right now.";

  const raw = await chatJSON<unknown>(
    [
      { role: "system", content: systemPromptFor(traits) },
      { role: "user", content: `${goalContext}\n\nUser message: ${message}` },
    ],
    { temperature: 0.3 }
  );

  return normalizeReply(raw);
}
