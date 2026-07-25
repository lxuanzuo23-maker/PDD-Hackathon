"use client";

import { useState } from "react";
import {
  type CheckInResult,
  type Mood,
  submitGoalCheckIn,
} from "@/lib/ui-data";

const moods: { value: Mood; label: string; emoji: string }[] = [
  { value: "rough", label: "Rough", emoji: "🌧️" },
  { value: "low", label: "Low", emoji: "🌥️" },
  { value: "okay", label: "Okay", emoji: "☁️" },
  { value: "good", label: "Good", emoji: "🌤️" },
  { value: "great", label: "Great", emoji: "☀️" },
];

export function CheckInFlow({
  goalId,
  onCancel,
  onComplete,
}: {
  goalId: string;
  onCancel: () => void;
  onComplete: (result: CheckInResult) => void;
}) {
  const [what, setWhat] = useState("");
  const [hardest, setHardest] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!what.trim() || !hardest.trim() || !mood) {
      setError("Answer all three check-in questions.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await submitGoalCheckIn(goalId, [
        what.trim(),
        hardest.trim(),
        mood,
      ]);
      onComplete(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verification is offline — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-moss-50 rounded-2xl p-4 space-y-4" aria-labelledby="check-in-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="check-in-title" className="font-display text-xl text-moss-900">
            Check in honestly
          </h2>
          <p className="text-sm text-moss-500">Specific beats perfect.</p>
        </div>
        <button onClick={onCancel} className="text-sm text-moss-700 underline">
          Not now
        </button>
      </div>

      <label className="block space-y-1 text-sm font-medium text-moss-900">
        <span>What did you actually do today toward this goal?</span>
        <textarea
          value={what}
          onChange={(event) => setWhat(event.target.value)}
          className="w-full rounded-xl border border-moss-200 bg-paper p-3 font-normal"
          rows={3}
          maxLength={500}
        />
      </label>

      <label className="block space-y-1 text-sm font-medium text-moss-900">
        <span>What was the hardest part?</span>
        <textarea
          value={hardest}
          onChange={(event) => setHardest(event.target.value)}
          className="w-full rounded-xl border border-moss-200 bg-paper p-3 font-normal"
          rows={3}
          maxLength={500}
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-moss-900">How did this feel?</legend>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {moods.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMood(item.value)}
              className={`rounded-xl border px-1 py-2 text-xs ${
                mood === item.value
                  ? "border-moss-700 bg-moss-700 text-paper"
                  : "border-moss-200 bg-paper text-moss-700"
              }`}
              aria-pressed={mood === item.value}
            >
              <span className="block text-base">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-xl border border-gold bg-gold/20 p-3 text-sm text-moss-900">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-full bg-moss-700 px-4 py-3 text-sm font-semibold text-paper disabled:opacity-60"
      >
        {submitting ? "Verifying…" : "Finish check-in"}
      </button>
    </section>
  );
}

export function CheckInResultCard({
  result,
  onRewards,
  onDismiss,
}: {
  result: CheckInResult;
  onRewards: () => void;
  onDismiss: () => void;
}) {
  return (
    <section className="rounded-2xl border border-gold bg-gold/20 p-5 text-center space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-moss-700">
        {result.verdict}
      </p>
      <h2 className="font-display text-2xl text-moss-900">+{result.pointsAwarded} pts</h2>
      <p className="text-sm text-moss-700">{result.verdictMessage}</p>
      <div className="flex justify-center gap-4 text-sm text-moss-700">
        <span>{result.multiplier}× effort</span>
        <span>🔥 {result.streakDays}</span>
        <span>{result.newBalance} pts</span>
      </div>
      <div className="flex justify-center gap-3">
        <button onClick={onDismiss} className="rounded-full border border-moss-300 px-4 py-2 text-sm text-moss-700">
          Back to goals
        </button>
        <button onClick={onRewards} className="rounded-full bg-moss-700 px-4 py-2 text-sm font-semibold text-paper">
          Spend points
        </button>
      </div>
    </section>
  );
}
