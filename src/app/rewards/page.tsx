"use client";

import { useEffect, useState } from "react";

interface RewardItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  kind: string;
}

interface CompanionState {
  level: number;
  xp: number;
  mood: string;
}

export default function RewardsPage() {
  const [items, setItems] = useState<RewardItem[]>([]);
  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  function load() {
    fetch("/api/rewards")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items);
        setCompanion(data.companionState);
      });
  }

  useEffect(load, []);

  async function redeem(id: string) {
    const res = await fetch(`/api/rewards/${id}/redeem`, { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 1200);
      load();
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-moss-900">Rewards</h1>

      <div
        className={`bg-moss-50 rounded-blob p-8 text-center transition-transform ${
          celebrating ? "scale-110" : ""
        }`}
      >
        <div className="text-6xl">🐣</div>
        <p className="mt-2 font-medium text-moss-900">
          Level {companion?.level ?? 1}
        </p>
        <p className="text-xs text-moss-500">{companion?.mood ?? "content"}</p>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="bg-moss-50 rounded-2xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-moss-900">{item.name}</p>
              <p className="text-xs text-moss-500">{item.description}</p>
            </div>
            <button
              onClick={() => redeem(item.id)}
              className="text-sm font-semibold text-spark border border-spark rounded-full px-3 py-1"
            >
              {item.cost} pts
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
