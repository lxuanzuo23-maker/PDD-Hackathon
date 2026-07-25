"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckInFlow, CheckInResultCard } from "@/components/CheckInFlow";
import {
  createGoal,
  getTodayGoals,
  isFixtureMode,
  type CheckInResult,
  type GoalsTodayResponse,
  type PenaltyNotice,
} from "@/lib/ui-data";

export default function TodayPage() {
  const [data, setData] = useState<GoalsTodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [penalties, setPenalties] = useState<PenaltyNotice[]>([]);
  const [checkingGoalId, setCheckingGoalId] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [addingGoal, setAddingGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [endDate, setEndDate] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await getTodayGoals();
      setData(response);
      const unseen = response.penaltiesApplied.filter((penalty) => {
        const key = `tinywins-penalty-${penalty.id}`;
        if (window.sessionStorage.getItem(key)) return false;
        window.sessionStorage.setItem(key, "shown");
        return true;
      });
      setPenalties(unseen);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your goals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function addGoal() {
    if (!goalTitle.trim() || !endDate) {
      setError("Give your goal a title and end date.");
      return;
    }
    try {
      const goal = await createGoal({ title: goalTitle.trim(), endDate });
      setData((current) =>
        current ? { ...current, goals: [goal, ...current.goals] } : current
      );
      setGoalTitle("");
      setEndDate("");
      setAddingGoal(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add that goal.");
    }
  }

  const selectedGoal = data?.goals.find((goal) => goal.id === checkingGoalId);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl text-moss-900">Today</h1>
            {isFixtureMode && <span className="rounded-full bg-gold/20 px-2 py-1 text-xs text-moss-700">Demo data</span>}
          </div>
          <p className="text-sm text-moss-500">Pick one thing. Just start it.</p>
        </div>
        <div className="text-right">
          <div className="text-spark font-semibold">🔥 {loading ? "…" : data?.streakDays ?? 0}</div>
          <div className="text-xs text-moss-500">{loading ? "…" : data?.pointsBalance ?? 0} pts</div>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-gold bg-gold/20 p-3 text-sm text-moss-900">
          {error} <button onClick={() => void load()} className="font-semibold underline">Retry</button>
        </div>
      )}

      {penalties.map((penalty) => (
        <div key={penalty.id} className="rounded-xl border border-gold bg-gold/20 p-3 text-sm text-moss-900">
          You missed {penalty.daysMissed} check-in{penalty.daysMissed === 1 ? "" : "s"} for {penalty.goalTitle} — {penalty.pointsDeducted} pts applied.
        </div>
      ))}

      {loading && <p className="text-sm text-moss-500">Loading your active goals…</p>}

      {result && (
        <CheckInResultCard
          result={result}
          onDismiss={() => {
            setResult(null);
            setCheckingGoalId(null);
          }}
          onRewards={() => window.location.assign("/rewards")}
        />
      )}

      {selectedGoal && !result && (
        <CheckInFlow
          goalId={selectedGoal.id}
          onCancel={() => setCheckingGoalId(null)}
          onComplete={(completed) => {
            setResult(completed);
            setData((current) =>
              current
                ? {
                    ...current,
                    pointsBalance: completed.newBalance,
                    streakDays: completed.streakDays,
                    companion: completed.companion,
                    goals: current.goals.map((goal) =>
                      goal.id === selectedGoal.id ? { ...goal, todayStatus: "done" } : goal
                    ),
                  }
                : current
            );
          }}
        />
      )}

      {!loading && !selectedGoal && !result && (
        <>
          {data?.goals.length === 0 ? (
            <section className="rounded-2xl bg-moss-50 p-5 text-center space-y-3">
              <h2 className="font-display text-xl text-moss-900">No active goals yet</h2>
              <p className="text-sm text-moss-500">Pick one direction. We will help you start small.</p>
              <button onClick={() => setAddingGoal(true)} className="rounded-full bg-moss-700 px-4 py-2 text-sm font-semibold text-paper">Add a goal</button>
            </section>
          ) : (
            <ul className="space-y-3">
              {data?.goals.map((goal) => (
                <li key={goal.id} className="rounded-2xl bg-moss-50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-moss-900">{goal.title}</p>
                      <p className="text-xs text-moss-500">Day {goal.periodDay} of {goal.periodTotal} · Daily · ends {new Date(goal.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${goal.todayStatus === "done" ? "bg-moss-200 text-moss-700" : goal.todayStatus === "missed" ? "bg-gold/20 text-moss-700" : "bg-paper text-spark"}`}>
                      {goal.todayStatus === "due" ? "Due today" : goal.todayStatus === "done" ? "Done" : "Missed"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {goal.todayStatus === "due" && (
                      <>
                        <button onClick={() => setCheckingGoalId(goal.id)} className="rounded-full bg-moss-700 px-3 py-2 text-sm font-semibold text-paper">Check in</button>
                        <Link href={`/coach?goalId=${encodeURIComponent(goal.id)}`} className="rounded-full border border-spark px-3 py-2 text-sm font-semibold text-spark">I&apos;m stuck</Link>
                      </>
                    )}
                    {goal.todayStatus === "done" && (
                      <Link href={`/growth?goalId=${encodeURIComponent(goal.id)}`} className="rounded-full border border-moss-300 px-3 py-2 text-sm text-moss-700">View in Growth</Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data?.goals.length ? <button onClick={() => setAddingGoal(true)} className="w-full rounded-full border border-moss-300 py-3 text-sm font-medium text-moss-700">+ Add a daily goal</button> : null}
        </>
      )}

      {addingGoal && (
        <section className="rounded-2xl border border-moss-200 bg-paper p-4 space-y-3">
          <h2 className="font-display text-xl text-moss-900">Add a daily goal</h2>
          <label className="block text-sm text-moss-700">Goal title
            <input value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-moss-200 p-3" placeholder="e.g. Save for a car" />
          </label>
          <label className="block text-sm text-moss-700">End date
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 w-full rounded-xl border border-moss-200 p-3" />
          </label>
          <p className="text-xs text-moss-500">Cadence: Daily</p>
          <div className="flex gap-2">
            <button onClick={() => setAddingGoal(false)} className="rounded-full border border-moss-300 px-4 py-2 text-sm text-moss-700">Cancel</button>
            <button onClick={() => void addGoal()} className="rounded-full bg-moss-700 px-4 py-2 text-sm font-semibold text-paper">Add goal</button>
          </div>
        </section>
      )}
    </div>
  );
}
