import { chatJSON } from "@/lib/llm";

export interface CoachReply {
  reply: string;
  microStep?: string;
  timerSeconds?: number;
}

const SYSTEM_PROMPT = `You are the AI coach inside TinyWins, an accountability app for people
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

export async function handleCoachMessage(
  message: string,
  task: { title: string; difficulty: 1 | 2 | 3 } | null
): Promise<CoachReply> {
  const taskContext = task
    ? `The user is currently working on: "${task.title}" (difficulty ${task.difficulty}/3).`
    : "There is no specific task in context right now.";

  return chatJSON<CoachReply>(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${taskContext}\n\nUser message: ${message}` },
    ],
    { temperature: 0.3 }
  );
}
