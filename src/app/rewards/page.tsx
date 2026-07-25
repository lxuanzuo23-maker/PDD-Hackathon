"use client";

import { useEffect, useState } from "react";
import {
  getRewards,
  isFixtureMode,
  redeemReward,
  type RewardsResponse,
} from "@/lib/ui-data";

const kindIcon = { accessory: "🎩", theme: "🎨", "skip-token": "🛡️" };

export default function RewardsPage() {
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setData(await getRewards());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load rewards.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function redeem(id: string) {
    if (!data) return;
    setRedeemingId(id);
    setError(null);
    try {
      const previousLevel = data.companion.level;
      const result = await redeemReward(id);
      setData((current) =>
        current
          ? {
              ...current,
              pointsBalance: result.newBalance,
              companion: result.companion,
            }
          : current
      );
      const didLevelUp = result.companion.level > previousLevel;
      setLevelUp(didLevelUp);
      setCelebrating(true);
      window.setTimeout(() => {
        setCelebrating(false);
        setLevelUp(false);
      }, 1200);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not redeem that reward.");
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl text-moss-900">Rewards</h1>
            {isFixtureMode && <span className="rounded-full bg-gold/20 px-2 py-1 text-xs text-moss-700">Demo data</span>}
          </div>
          <p className="text-sm text-moss-500">Spend points on a little encouragement.</p>
        </div>
        <p className="font-semibold text-spark">{data?.pointsBalance ?? "…"} pts</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-gold bg-gold/20 p-3 text-sm text-moss-900">{error}</p>}

      <section className={`relative rounded-blob bg-moss-50 p-8 text-center transition-transform ${celebrating ? "scale-110" : ""}`}>
        {levelUp && <p className="absolute inset-x-0 top-3 text-sm font-semibold text-spark">Level up!</p>}
        <div className="text-6xl">🐣</div>
        <p className="mt-2 font-medium text-moss-900">Level {data?.companion.level ?? 1}</p>
        <p className="text-xs text-moss-500">{data?.companion.mood ?? "content"} · {data?.companion.xp ?? 0} XP</p>
      </section>

      {!data && !error && <p className="text-sm text-moss-500">Loading your rewards…</p>}

      <ul className="space-y-3">
        {data?.items.map((item) => {
          const remaining = item.cost - data.pointsBalance;
          const affordable = remaining <= 0;
          return (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-moss-50 p-4">
              <div>
                <p className="font-medium text-moss-900">{kindIcon[item.kind]} {item.name}</p>
                <p className="text-xs text-moss-500">{item.description}</p>
              </div>
              <button
                onClick={() => void redeem(item.id)}
                disabled={!affordable || redeemingId === item.id}
                className="rounded-full border border-spark px-3 py-2 text-sm font-semibold text-spark disabled:border-moss-200 disabled:text-moss-500"
              >
                {redeemingId === item.id ? "Redeeming…" : affordable ? `${item.cost} pts` : `Need ${remaining} more`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
