"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOnboardingStatus } from "@/lib/ui-data";

export default function HomePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOnboardingStatus()
      .then((status) => router.replace(status.completed ? "/today" : "/onboarding"))
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Could not start TinyWins.");
      });
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-3">
      <div className="text-4xl">🌱</div>
      <h1 className="font-display text-2xl text-moss-900">TinyWins</h1>
      {error ? (
        <p role="alert" className="rounded-xl border border-gold bg-gold/20 p-3 text-sm text-moss-900">
          {error}
        </p>
      ) : (
        <p className="text-sm text-moss-500">Finding your next small win…</p>
      )}
    </div>
  );
}
