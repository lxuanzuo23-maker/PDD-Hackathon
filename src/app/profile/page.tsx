"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfile, isFixtureMode, type ProfileResponse } from "@/lib/ui-data";

const moodEmoji: Record<string, string> = {
  rough: "🌧️",
  low: "🌥️",
  okay: "☁️",
  good: "🌤️",
  great: "☀️",
};

const styleBlurb: Record<string, string> = {
  direct: "Gets to the point.",
  encouraging: "Leads with warmth.",
  playful: "Keeps it light.",
  achievement: "Motivates with progress.",
  support: "Motivates with reassurance.",
  competition: "Motivates with a challenge.",
};

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getProfile());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl text-moss-900">You</h1>
          {isFixtureMode && (
            <span className="rounded-full bg-gold/20 px-2 py-1 text-xs text-moss-700">
              Demo data
            </span>
          )}
        </div>
        <p className="text-sm text-moss-500">What TinyWins knows, and how it adapts.</p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-gold bg-gold/20 p-3 text-sm text-moss-900">
          {error}{" "}
          <button onClick={() => void load()} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-moss-500">Loading your profile…</p>}

      {data && !loading && !data.onboarded && (
        <section className="rounded-2xl bg-moss-50 p-5 text-center space-y-3">
          <h2 className="font-display text-xl text-moss-900">No profile yet</h2>
          <p className="text-sm text-moss-500">
            Answer a few questions and your coach will adapt to how you like to be
            spoken to.
          </p>
          <Link
            href="/onboarding"
            className="inline-block rounded-full bg-moss-700 px-4 py-2 text-sm font-semibold text-paper"
          >
            Set up your profile
          </Link>
        </section>
      )}

      {data && !loading && (
        <>
          <section className="grid grid-cols-4 gap-2 rounded-2xl bg-moss-50 p-4 text-center text-sm">
            <div>
              <p className="font-semibold text-spark">🔥 {data.stats.streakDays}</p>
              <p className="text-xs text-moss-500">streak</p>
            </div>
            <div>
              <p className="font-semibold text-moss-900">{data.stats.pointsBalance}</p>
              <p className="text-xs text-moss-500">points</p>
            </div>
            <div>
              <p className="font-semibold text-moss-900">{data.stats.activeGoals}</p>
              <p className="text-xs text-moss-500">goals</p>
            </div>
            <div>
              <p className="font-semibold text-moss-900">{data.stats.totalCheckIns}</p>
              <p className="text-xs text-moss-500">check-ins</p>
            </div>
          </section>

          {data.onboarded && (
            <section className="rounded-2xl bg-moss-50 p-5 space-y-3">
              <h2 className="font-display text-xl text-moss-900">How your coach talks to you</h2>
              <div className="space-y-2 text-sm">
                {data.communicationStyle && (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="rounded-full bg-paper px-3 py-1 font-medium text-moss-900">
                      {data.communicationStyle}
                    </span>
                    <span className="text-xs text-moss-500">
                      {styleBlurb[data.communicationStyle]}
                    </span>
                  </div>
                )}
                {data.motivationStyle && (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="rounded-full bg-paper px-3 py-1 font-medium text-moss-900">
                      {data.motivationStyle}
                    </span>
                    <span className="text-xs text-moss-500">
                      {styleBlurb[data.motivationStyle]}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-moss-500">
                A first guess from your answers — it shifts as you check in.
              </p>
            </section>
          )}

          {(data.habitToImprove || data.newHabitGoal) && (
            <section className="rounded-2xl bg-moss-50 p-5 space-y-3">
              <h2 className="font-display text-xl text-moss-900">What you came here for</h2>
              {data.habitToImprove && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-moss-500">Improving</p>
                  <p className="text-sm text-moss-900">{data.habitToImprove}</p>
                </div>
              )}
              {data.newHabitGoal && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-moss-500">Starting</p>
                  <p className="text-sm text-moss-900">{data.newHabitGoal}</p>
                </div>
              )}
            </section>
          )}

          {(data.visionBoardImageUrl || data.visionBoardThemes.length > 0) && (
            <section className="rounded-2xl bg-moss-50 p-5 space-y-3">
              <h2 className="font-display text-xl text-moss-900">Your vision board</h2>
              {data.visionBoardImageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element -- stored
                   as an inline base64 data URL, so next/image adds nothing. */
                <img
                  src={data.visionBoardImageUrl}
                  alt="Your vision board"
                  className="w-full rounded-xl object-cover"
                />
              )}
              {data.visionBoardThemes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.visionBoardThemes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full bg-paper px-3 py-1 text-xs text-moss-700"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-moss-500">
                  We couldn&apos;t read themes from this image — it&apos;s still yours to look at.
                </p>
              )}
            </section>
          )}

          {data.recentMoods.length > 0 && (
            <section className="rounded-2xl bg-moss-50 p-5 space-y-3">
              <h2 className="font-display text-xl text-moss-900">How you&apos;ve been feeling</h2>
              <ul className="space-y-1">
                {data.recentMoods.map((entry, index) => (
                  <li
                    key={`${entry.date}-${index}`}
                    className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 text-sm"
                  >
                    <span className="text-moss-700">
                      <span className="mr-2">{moodEmoji[entry.mood] ?? "·"}</span>
                      {entry.mood}
                    </span>
                    <span className="text-xs text-moss-500">{formatDay(entry.date)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.onboarded && (
            <section className="rounded-2xl bg-moss-50 p-5 space-y-1 text-sm">
              <h2 className="font-display text-xl text-moss-900">Details</h2>
              {data.age !== undefined && (
                <p className="text-moss-700">
                  Age <span className="text-moss-900">{data.age}</span>
                </p>
              )}
              {data.gender && (
                <p className="text-moss-700">
                  Gender <span className="text-moss-900">{data.gender}</span>
                </p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
