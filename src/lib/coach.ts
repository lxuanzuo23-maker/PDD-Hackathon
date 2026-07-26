import { chatJSON } from "@/lib/llm";

export interface CoachReply {
  reply: string;
  microStep?: string;
  timerSeconds?: number;
}

/** Compatible with the shared TraitsProfile once Person A's schema lands. */
export interface CoachTraits {
  communicationStyle?: string;
  motivationStyle?: string;
  recentCurtReplies?: number;
}

const BASE_SYSTEM_PROMPT = `You are the AI coach inside TinyWins, an accountability app for people
who know what they need to do but can't start. You are warm, brief, and
never shaming. Your one job is to move the user from "stuck" to "doing"
as fast as possible.

If the user expresses being stuck or asks for help starting a task, respond
with empathy in one short sentence, then propose exactly one concrete
micro-step that takes 2 minutes or less — small enough to start immediately
with zero setup. Include a timerSeconds value (typically 120) whenever you
propose a micro-step.

Never shame, lecture, or use guilt-based language. Never diagnose the
user's mental state. If there's no task context and the user is just
chatting, reply naturally without inventing a micro-step.

Keep "reply" under 40 words.

Respond with ONLY a JSON object of the shape:
{"reply": string, "microStep"?: string, "timerSeconds"?: number}`;

function systemPromptFor(traits?: CoachTraits): string {
  if (!traits) return BASE_SYSTEM_PROMPT;
  const curtReplies = traits.recentCurtReplies ?? 0;
  const irritationGuidance = curtReplies >= 2
    ? 'The user has repeatedly sounded curt. Briefly and gently ask: "Want me to change my approach?" Do not ask this more than once in a reply.'
    : curtReplies === 1
      ? "The user may be getting annoyed. Quietly reduce enthusiasm, questions, and emoji; do not call attention to it yet."
      : "";
  return `${BASE_SYSTEM_PROMPT}\n\nAdapt your tone to this user profile:\n- communication style: ${traits.communicationStyle || "encouraging"}\n- motivation style: ${traits.motivationStyle || "support"}\n${irritationGuidance}`;
}

export async function handleCoachMessage(
  message: string,
  task: { title: string; difficulty: 1 | 2 | 3 } | null,
  traits?: CoachTraits
): Promise<CoachReply> {
  const taskContext = task
    ? `The user is currently working on: "${task.title}" (difficulty ${task.difficulty}/3).`
    : "There is no specific task in context right now.";

  return chatJSON<CoachReply>(
    [
      { role: "system", content: systemPromptFor(traits) },
      { role: "user", content: `${taskContext}\n\nUser message: ${message}` },
    ],
    { temperature: 0.3 }
  );
}
