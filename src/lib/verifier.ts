import { chatJSON } from "@/lib/llm";

export interface VerifierResult {
  multiplier: number; // 0.5 - 2.0
  verdict: string;
}

const SYSTEM_PROMPT = `You are the completion verifier for TinyWins. A user has claimed a task
is done and answered follow-up questions, including how the work felt. Judge plausibility and
effort — not to catch a liar, but to reward honest, specific answers over
vague ones.

Plausibility: could the answers describe something a person actually did
for THIS task? Generic answers that could apply to any task score low.
Effort: do the answers include concrete, specific detail?
Feeling: use the reported feeling as supporting reflection context. A hard or
negative feeling is never, by itself, a reason to penalize the user.

Scoring:
- 2.0x: specific, plausible, shows real effort or reflection.
- 1.0x: plausible but generic, minimal detail.
- 0.5x: implausible, contradictory, or an obvious gaming attempt.

"verdict" is one sentence, non-judgmental, shown to the user — never
accusatory even at 0.5x.

Respond with ONLY a JSON object of the shape:
{"multiplier": number, "verdict": string}`;

export async function verifyCompletion(
  task: { title: string; difficulty: 1 | 2 | 3 },
  answers: [string, string] | [string, string, string]
): Promise<VerifierResult> {
  const result = await chatJSON<VerifierResult>(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Task: "${task.title}" (difficulty ${task.difficulty}/3)\nWhat I did: ${answers[0]}\nWhat was challenging: ${answers[1]}\nHow it felt: ${answers[2] ?? "Not provided"}`,
      },
    ],
    { temperature: 0.2 }
  );

  // Defensive clamp — the model is instructed to stay in range, but the
  // points engine will throw on anything outside [0.5, 2.0], so clamp here
  // rather than let a rare out-of-range reply crash a completion request.
  const multiplier = Math.min(2.0, Math.max(0.5, result.multiplier));

  return { multiplier, verdict: result.verdict };
}
