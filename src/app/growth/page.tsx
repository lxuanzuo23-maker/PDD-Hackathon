"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getGrowth,
  getGrowthGoals,
  isFixtureMode,
  type GoalSummary,
  type GrowthResponse,
} from "@/lib/ui-data";

function GrowthContent() {
  const searchParams = useSearchParams();
  const requestedGoalId = searchParams.get("goalId");
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [growth, setGrowth] = useState<GrowthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGrowthGoals()
      .then((items) => {
        setGoals(items);
        const requested = items.find((item) => item.id === requestedGoalId);
        setSelectedGoalId(requested?.id ?? items[0]?.id ?? null);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load your goals."))
      .finally(() => setLoading(false));
  }, [requestedGoalId]);

  useEffect(() => {
    if (!selectedGoalId) return;
    setLoading(true);
    setError(null);
    getGrowth(selectedGoalId)
      .then(setGrowth)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load growth data."))
      .finally(() => setLoading(false));
  }, [selectedGoalId]);

  const maxValue = Math.max(
    1,
    ...(growth?.pointsSeries.map((point) => Math.max(point.earned, point.penalty)) ?? [1])
  );

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl text-moss-900">Growth</h1>
          {isFixtureMode && <span className="rounded-full bg-gold/20 px-2 py-1 text-xs text-moss-700">Demo data</span>}
        </div>
        <p className="text-sm text-moss-500">How you&apos;re showing up.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-gold bg-gold/20 p-3 text-sm text-moss-900">{error}</p>}

      {!loading && goals.length === 0 && (
        <section className="rounded-2xl bg-moss-50 p-5 text-center space-y-3">
          <h2 className="font-display text-xl text-moss-900">No goals to reflect on yet</h2>
          <Link href="/today" className="inline-block rounded-full bg-moss-700 px-4 py-2 text-sm font-semibold text-paper">Add a goal</Link>
        </section>
      )}

      {goals.length > 1 && (
        <label className="block text-sm font-medium text-moss-700">
          Viewing
          <select value={selectedGoalId ?? ""} onChange={(event) => setSelectedGoalId(event.target.value)} className="mt-1 w-full rounded-xl border border-moss-200 bg-paper p-3 text-moss-900">
            {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}{goal.status === "ended" ? " (ended)" : ""}</option>)}
          </select>
        </label>
      )}

      {loading && <p className="text-sm text-moss-500">Loading your progress…</p>}

      {growth && !loading && (
        <>
          <section className="rounded-2xl border border-gold bg-gold/20 p-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-moss-700">Goal room reflection</p>
            {growth.room?.reflection?.status === "ready" && growth.room.reflection.text ? (
              <p className="text-sm text-moss-900">{growth.room.reflection.text}</p>
            ) : (
              <p className="text-sm text-moss-700">Reflection unavailable — your progress stats are still here.</p>
            )}
          </section>
          <section className="rounded-2xl bg-moss-50 p-5 space-y-3">
            <div>
              <h2 className="font-display text-xl text-moss-900">{growth.goal.title}</h2>
              <p className="text-xs text-moss-500">{new Date(growth.goal.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {new Date(growth.goal.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            {growth.goal.status === "ended" && <p className="rounded-xl bg-gold/20 p-2 text-sm text-moss-700">This goal has ended. Its history is read-only.</p>}
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div><p className="font-semibold text-moss-900">{growth.summary.checkInsDone}/{growth.summary.checkInsExpected}</p><p className="text-xs text-moss-500">check-ins</p></div>
              <div><p className="font-semibold text-moss-900">{growth.summary.skips}</p><p className="text-xs text-moss-500">skips</p></div>
              <div><p className="font-semibold text-spark">{growth.summary.netPoints > 0 ? "+" : ""}{growth.summary.netPoints}</p><p className="text-xs text-moss-500">net pts</p></div>
            </div>
          </section>

          <section className="rounded-2xl bg-moss-50 p-5 space-y-3">
            <h2 className="font-display text-xl text-moss-900">Points over time</h2>
            <div className="flex h-40 items-end gap-2" aria-label="Daily net points chart">
              {growth.pointsSeries.map((point) => {
                const net = point.earned - point.penalty;
                const height = `${Math.max(8, (Math.abs(net) / maxValue) * 100)}%`;
                return (
                  <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${point.date}: ${net >= 0 ? "+" : ""}${net} points`}>
                    <div className={`w-full rounded-t ${net >= 0 ? "bg-spark" : "bg-gold"}`} style={{ height }} />
                    <span className="truncate text-[10px] text-moss-500">{point.date.replace("Jul ", "")}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-moss-500">Green = earned points · gold = skipped-day deduction</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-xl text-moss-900">History</h2>
            <ul className="space-y-2">
              {growth.history.map((entry) => (
                <li key={entry.date} className="flex items-center justify-between rounded-xl bg-moss-50 p-3 text-sm">
                  <div><span className="mr-2">{entry.status === "done" ? "✅" : entry.status === "skipped" ? "⏭" : entry.status === "due" ? "○" : "·"}</span>{entry.date}</div>
                  <span className="text-moss-500">{entry.status === "done" ? `${entry.verdict} · +${entry.points} pts` : entry.status === "skipped" ? `skipped · ${entry.points} pts` : entry.status}</span>
                </li>
              ))}
            </ul>
          </section>

          {growth.room?.events?.length ? (
            <section className="space-y-2">
              <h2 className="font-display text-xl text-moss-900">Goal room timeline</h2>
              <ul className="space-y-2">
                {growth.room.events.map((event) => (
                  <li key={event.id} className="rounded-xl bg-moss-50 p-3 text-sm text-moss-700">
                    <p className="font-medium text-moss-900">{event.type.replace(".", " ")}</p>
                    <p className="text-xs text-moss-500">{new Date(event.occurredAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function GrowthPage() {
  return <Suspense><GrowthContent /></Suspense>;
}
