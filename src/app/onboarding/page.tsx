"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getOnboardingStatus, isFixtureMode, type Mood, submitOnboarding } from "@/lib/ui-data";

const moodOptions: { value: Mood; label: string; emoji: string }[] = [
  { value: "rough", label: "Rough", emoji: "🌧️" },
  { value: "low", label: "Low", emoji: "🌥️" },
  { value: "okay", label: "Okay", emoji: "☁️" },
  { value: "good", label: "Good", emoji: "🌤️" },
  { value: "great", label: "Great", emoji: "☀️" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [habitToImprove, setHabitToImprove] = useState("");
  const [newHabitGoal, setNewHabitGoal] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [visionBoard, setVisionBoard] = useState<File | null>(null);

  const previewUrl = useMemo(
    () => (visionBoard ? URL.createObjectURL(visionBoard) : null),
    [visionBoard]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    getOnboardingStatus()
      .then((status) => {
        if (status.completed) router.replace("/today");
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Could not check onboarding status.");
      })
      .finally(() => setChecking(false));
  }, [router]);

  function next() {
    if (step === 1 && (!/^\d+$/.test(age) || Number(age) < 13 || Number(age) > 120)) {
      setError("Enter an age between 13 and 120.");
      return;
    }
    if (step === 2 && !gender.trim()) {
      setError("Choose or describe your gender.");
      return;
    }
    if (step === 6 && !mood) {
      setError("Choose how today feels.");
      return;
    }
    setError(null);
    setStep((current) => Math.min(6, current + 1));
  }

  function selectVisionBoard(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Vision boards must be 5 MB or smaller.");
      return;
    }
    setError(null);
    setVisionBoard(file);
  }

  async function submit() {
    if (!mood) {
      setError("Choose how today feels.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const data = new FormData();
    data.set("age", age);
    data.set("gender", gender);
    data.set("habitToImprove", habitToImprove);
    data.set("newHabitGoal", newHabitGoal);
    data.set("mood", mood);
    if (visionBoard) data.set("visionBoard", visionBoard);

    try {
      setAnalyzing(true);
      const result = await submitOnboarding(data);
      if (result.analysisStatus === "unavailable") {
        window.sessionStorage.setItem(
          "tinywins-onboarding-notice",
          "Your vision board was saved; its theme analysis is unavailable right now."
        );
      }
      router.replace("/today?welcome=1");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your profile.");
    } finally {
      setSubmitting(false);
      setAnalyzing(false);
    }
  }

  if (checking || analyzing) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-3">
        <div className="text-4xl">{analyzing ? "✨" : "🌱"}</div>
        <h1 className="font-display text-2xl text-moss-900">
          {analyzing ? "Learning what matters to you…" : "Getting ready…"}
        </h1>
        <p className="text-sm text-moss-500">
          {analyzing ? "Your profile is being saved." : "Checking your starting point."}
        </p>
      </div>
    );
  }

  const title = [
    "A little about you",
    "How should we address you?",
    "What feels sticky lately?",
    "What would you like to grow?",
    "Bring a little inspiration",
    "How does today feel?",
  ][step - 1];

  return (
    <div className="space-y-6 pb-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-moss-500">
          <span>Step {step} of 6</span>
          {isFixtureMode && <span className="rounded-full bg-gold/20 px-2 py-1 text-moss-700">Demo data</span>}
        </div>
        <div className="flex gap-1" aria-label={`Step ${step} of 6`}>
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className={`h-1 flex-1 rounded-full ${index < step ? "bg-moss-700" : "bg-moss-200"}`} />
          ))}
        </div>
        <h1 className="font-display text-3xl text-moss-900">{title}</h1>
      </header>

      <section className="bg-moss-50 rounded-2xl p-5 space-y-4">
        {step === 1 && (
          <label className="block space-y-2 text-sm font-medium text-moss-900">
            <span>Age</span>
            <input value={age} onChange={(event) => setAge(event.target.value)} inputMode="numeric" className="w-full rounded-xl border border-moss-200 bg-paper p-3" placeholder="e.g. 28" />
          </label>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-moss-700">Choose what feels right. You can also type your own.</p>
            <div className="grid grid-cols-2 gap-2">
              {["Woman", "Man", "Non-binary", "Prefer not to say"].map((option) => (
                <button key={option} type="button" onClick={() => setGender(option)} className={`rounded-xl border p-3 text-sm ${gender === option ? "border-moss-700 bg-moss-700 text-paper" : "border-moss-200 bg-paper text-moss-700"}`}>
                  {option}
                </button>
              ))}
            </div>
            <input value={gender.startsWith("Custom: ") ? gender.slice(8) : ""} onChange={(event) => setGender(`Custom: ${event.target.value}`)} className="w-full rounded-xl border border-moss-200 bg-paper p-3 text-sm" placeholder="Or describe yourself" />
          </div>
        )}
        {step === 3 && (
          <label className="block space-y-2 text-sm font-medium text-moss-900">
            <span>What habit would you like to improve? <em className="font-normal text-moss-500">Optional</em></span>
            <textarea value={habitToImprove} onChange={(event) => setHabitToImprove(event.target.value)} maxLength={200} rows={4} className="w-full rounded-xl border border-moss-200 bg-paper p-3 font-normal" placeholder="e.g. scrolling before bed" />
          </label>
        )}
        {step === 4 && (
          <label className="block space-y-2 text-sm font-medium text-moss-900">
            <span>What new habit or goal would feel meaningful? <em className="font-normal text-moss-500">Optional</em></span>
            <textarea value={newHabitGoal} onChange={(event) => setNewHabitGoal(event.target.value)} maxLength={200} rows={4} className="w-full rounded-xl border border-moss-200 bg-paper p-3 font-normal" placeholder="e.g. read 10 pages before sleep" />
          </label>
        )}
        {step === 5 && (
          <div className="space-y-3">
            <p className="text-sm text-moss-700">Add an image that reminds you what you are working toward. This is optional.</p>
            {previewUrl ? (
              <div className="space-y-2">
                <img src={previewUrl} alt="Vision board preview" className="h-48 w-full rounded-xl object-cover" />
                <button type="button" onClick={() => setVisionBoard(null)} className="text-sm text-spark underline">Remove image</button>
              </div>
            ) : (
              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-moss-300 bg-paper p-4 text-center text-sm text-moss-700">
                <span className="text-2xl">🖼️</span>
                <span className="mt-2 font-medium">Choose a vision board</span>
                <span className="text-xs text-moss-500">JPEG, PNG, or WebP · max 5 MB</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => selectVisionBoard(event.target.files?.[0])} />
              </label>
            )}
          </div>
        )}
        {step === 6 && (
          <div className="space-y-3">
            <p className="text-sm text-moss-700">There is no wrong answer. This helps your buddy meet you where you are.</p>
            <div className="grid grid-cols-5 gap-1">
              {moodOptions.map((option) => (
                <button key={option.value} type="button" onClick={() => setMood(option.value)} aria-pressed={mood === option.value} className={`rounded-xl border p-2 text-xs ${mood === option.value ? "border-moss-700 bg-moss-700 text-paper" : "border-moss-200 bg-paper text-moss-700"}`}>
                  <span className="block text-xl">{option.emoji}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {error && <p role="alert" className="rounded-xl border border-gold bg-gold/20 p-3 text-sm text-moss-900">{error}</p>}

      <div className="flex gap-3">
        {step > 1 && <button type="button" onClick={() => { setError(null); setStep((current) => current - 1); }} className="rounded-full border border-moss-300 px-5 py-3 text-sm text-moss-700">Back</button>}
        {step < 6 ? (
          <button type="button" onClick={next} className="flex-1 rounded-full bg-moss-700 px-5 py-3 text-sm font-semibold text-paper">Continue</button>
        ) : (
          <button type="button" disabled={submitting} onClick={submit} className="flex-1 rounded-full bg-moss-700 px-5 py-3 text-sm font-semibold text-paper disabled:opacity-60">{submitting ? "Saving…" : "Start small"}</button>
        )}
      </div>
    </div>
  );
}
