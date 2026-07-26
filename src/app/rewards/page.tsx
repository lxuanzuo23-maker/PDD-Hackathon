"use client";

import { useEffect, useState } from "react";
import {
  getRewards,
  isFixtureMode,
  redeemReward,
  type RewardsResponse,
} from "@/lib/ui-data";

const kindLabel: Record<string, string> = {
  accessory: "Worn",
  theme: "Backdrop",
  "skip-token": "Kept",
};

// Backdrops for redeemed themes. Written as literal class strings so
// Tailwind's scanner keeps them — do not build these names dynamically.
const themeBackdrop: Record<string, string> = {
  meadow: "bg-gradient-to-b from-moss-200 to-moss-50",
  sunrise: "bg-gradient-to-b from-gold/40 to-paper",
  dusk: "bg-gradient-to-b from-moss-700/30 to-moss-200",
};

export default function RewardsPage() {
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const [justEarned, setJustEarned] = useState<string | null>(null);
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
      const item = data.items.find((i) => i.id === id);
      const result = await redeemReward(id);
      setData((current) =>
        current
          ? {
              ...current,
              pointsBalance: result.newBalance,
              companion: result.companion,
              owned: result.owned,
              look: result.look,
            }
          : current
      );
      setLevelUp(result.leveledUp);
      setJustEarned(item?.emoji ?? null);
      setCelebrating(true);
      window.setTimeout(() => {
        setCelebrating(false);
        setLevelUp(false);
        setJustEarned(null);
      }, 1600);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not redeem that reward.");
    } finally {
      setRedeemingId(null);
    }
  }

  const look = data?.look;
  const backdrop = look?.themeKey ? themeBackdrop[look.themeKey] : "bg-moss-50";
  const ownedById = new Map((data?.owned ?? []).map((o) => [o.rewardItemId, o]));
  const collection = (data?.items ?? []).filter((item) => ownedById.has(item.id));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl text-moss-900">Rewards</h1>
            {isFixtureMode && (
              <span className="rounded-full bg-gold/20 px-2 py-1 text-xs text-moss-700">
                Demo data
              </span>
            )}
          </div>
          <p className="text-sm text-moss-500">Spend points on a little encouragement.</p>
        </div>
        <p className="font-semibold text-spark">{data?.pointsBalance ?? "…"} pts</p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-gold bg-gold/20 p-3 text-sm text-moss-900">
          {error}
        </p>
      )}

      {/* The avatar. Everything redeemed shows up here — that's the payoff. */}
      <section
        className={`relative overflow-hidden rounded-blob p-8 text-center transition-all duration-300 ${backdrop} ${
          celebrating ? "scale-105" : ""
        }`}
      >
        {levelUp && (
          <p className="absolute inset-x-0 top-3 text-sm font-semibold text-spark">
            Level up!
          </p>
        )}

        {/* Worn accessories, floating above the companion. */}
        {look && look.accessories.length > 0 && (
          <div className="mb-1 flex justify-center gap-1 text-2xl" aria-label="Worn items">
            {look.accessories.map((emoji) => (
              <span key={emoji}>{emoji}</span>
            ))}
          </div>
        )}

        <div className={`text-6xl transition-transform ${celebrating ? "-translate-y-1" : ""}`}>
          🐣
        </div>

        {justEarned && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 animate-bounce text-3xl">
            {justEarned}
          </span>
        )}

        <p className="mt-2 font-medium text-moss-900">Level {data?.companion.level ?? 1}</p>
        <p className="text-xs text-moss-500">
          {data?.companion.mood ?? "content"} · {data?.companion.xp ?? 0} XP
          {look?.themeEmoji ? ` · ${look.themeEmoji}` : ""}
        </p>
        {look && look.accessories.length === 0 && !look.themeKey && data && (
          <p className="mt-2 text-xs text-moss-500">
            Nothing on yet — redeem something below and it shows up here.
          </p>
        )}
      </section>

      {collection.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-xl text-moss-900">Your collection</h2>
          <div className="flex flex-wrap gap-2">
            {collection.map((item) => {
              const owned = ownedById.get(item.id);
              return (
                <div
                  key={item.id}
                  title={`${item.name}${owned && owned.count > 1 ? ` ×${owned.count}` : ""}`}
                  className="relative rounded-xl bg-moss-50 px-3 py-2 text-2xl"
                >
                  {item.emoji}
                  {owned && owned.count > 1 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-spark px-1.5 text-[10px] font-semibold text-paper">
                      {owned.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!data && !error && <p className="text-sm text-moss-500">Loading your rewards…</p>}

      <ul className="space-y-3">
        {data?.items.map((item) => {
          const remaining = item.cost - data.pointsBalance;
          const affordable = remaining <= 0;
          const owned = ownedById.get(item.id);
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-moss-50 p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-moss-900">
                  {item.emoji} {item.name}
                  {owned && (
                    <span className="ml-2 text-xs font-normal text-moss-500">
                      owned{owned.count > 1 ? ` ×${owned.count}` : ""}
                    </span>
                  )}
                </p>
                <p className="text-xs text-moss-500">
                  {item.description} · {kindLabel[item.kind] ?? item.kind}
                </p>
              </div>
              <button
                onClick={() => void redeem(item.id)}
                disabled={!affordable || redeemingId === item.id}
                className="shrink-0 rounded-full border border-spark px-3 py-2 text-sm font-semibold text-spark disabled:border-moss-200 disabled:text-moss-500"
              >
                {redeemingId === item.id
                  ? "Redeeming…"
                  : affordable
                    ? `${item.cost} pts`
                    : `Need ${remaining} more`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
