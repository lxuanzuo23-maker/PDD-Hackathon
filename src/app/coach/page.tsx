"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CheckInFlow, CheckInResultCard } from "@/components/CheckInFlow";
import {
  isFixtureMode,
  sendCoachFeedback,
  sendCoachMessage,
  type CheckInResult,
  type CoachReply,
} from "@/lib/ui-data";

type Phase = "chatting" | "microStepReady" | "timing" | "interview" | "submitting" | "result";
type Message = { from: "user" | "coach"; text: string };

function CoachChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalId = searchParams.get("goalId") ?? undefined;
  const [phase, setPhase] = useState<Phase>("chatting");
  const [messages, setMessages] = useState<Message[]>([
    { from: "coach", text: "What feels hardest to begin?" },
  ]);
  const [input, setInput] = useState("");
  const [microStep, setMicroStep] = useState<CoachReply["microStep"]>();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApproachCheckIn, setShowApproachCheckIn] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef("");
  const autoSentGoalRef = useRef<string | null>(null);

  useEffect(() => {
    const existing = window.sessionStorage.getItem("tinywins-coach-session-id");
    const sessionId = existing || crypto.randomUUID();
    if (!existing) window.sessionStorage.setItem("tinywins-coach-session-id", sessionId);
    sessionIdRef.current = sessionId;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!goalId || !sessionIdRef.current || autoSentGoalRef.current === goalId) return;
    autoSentGoalRef.current = goalId;
    void send("I’m stuck—help me start.", true);
    // The ref intentionally prevents a duplicate send in React Strict Mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId]);

  function startTimer() {
    if (!microStep) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("timing");
    setSecondsLeft(microStep.timerSeconds);
    timerRef.current = setInterval(() => {
      setSecondsLeft((current) => {
        if (current === null || current <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  async function send(text = input, isAutomatic = false) {
    if (!text.trim() || !sessionIdRef.current) return;
    setError(null);
    if (!isAutomatic) setInput("");
    setMessages((current) => [...current, { from: "user", text }]);
    try {
      const reply = await sendCoachMessage({
        message: text,
        goalId,
        sessionId: sessionIdRef.current,
      });
      setMessages((current) => [...current, { from: "coach", text: reply.reply }]);
      setShowApproachCheckIn(Boolean(reply.showApproachCheckIn));
      if (reply.microStep) {
        setMicroStep(reply.microStep);
        setPhase("microStepReady");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Coach is offline right now.");
    }
  }

  async function shareApproach(approach: "direct" | "gentle" | "unchanged") {
    try {
      await sendCoachFeedback({ goalId, sessionId: sessionIdRef.current, approach });
      setShowApproachCheckIn(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that preference.");
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl text-moss-900">Coach</h1>
            {isFixtureMode && <span className="rounded-full bg-gold/20 px-2 py-1 text-xs text-moss-700">Demo data</span>}
          </div>
          {goalId ? <p className="text-xs text-moss-500">Helping with your active goal</p> : <p className="text-xs text-moss-500">Tell me what is getting in the way.</p>}
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-gold bg-gold/20 p-3 text-sm text-moss-900">{error}</p>}

      <div className="space-y-2" aria-live="polite">
        {messages.map((message, index) => (
          <div key={index} className={message.from === "coach" ? "max-w-[85%] rounded-2xl rounded-bl-sm bg-moss-50 p-3 text-sm text-moss-900" : "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-moss-700 p-3 text-sm text-paper"}>
            {message.text}
          </div>
        ))}
      </div>

      {showApproachCheckIn && (
        <section className="rounded-2xl border border-moss-200 bg-paper p-4 space-y-3">
          <p className="font-medium text-moss-900">Want me to change how I show up?</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void shareApproach("direct")} className="rounded-full border border-moss-300 px-3 py-2 text-sm text-moss-700">More direct</button>
            <button onClick={() => void shareApproach("gentle")} className="rounded-full border border-moss-300 px-3 py-2 text-sm text-moss-700">More gentle</button>
            <button onClick={() => void shareApproach("unchanged")} className="rounded-full border border-moss-300 px-3 py-2 text-sm text-moss-700">Keep trying this</button>
          </div>
        </section>
      )}

      {microStep && (phase === "microStepReady" || phase === "timing") && (
        <section className="rounded-2xl border border-gold bg-gold/20 p-5 text-center space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-moss-700">2-minute start</p>
          <p className="font-medium text-moss-900">{microStep.description}</p>
          {phase === "microStepReady" ? (
            <button onClick={startTimer} className="rounded-full bg-moss-700 px-5 py-3 text-sm font-semibold text-paper">Start timer</button>
          ) : (
            <>
              <p className="font-display text-4xl text-spark">
                {Math.floor((secondsLeft ?? 0) / 60)}:{String((secondsLeft ?? 0) % 60).padStart(2, "0")}
              </p>
              {goalId && <button onClick={() => setPhase("interview")} className="rounded-full bg-moss-700 px-5 py-3 text-sm font-semibold text-paper">I&apos;m done</button>}
            </>
          )}
        </section>
      )}

      {phase === "interview" && goalId && (
        <CheckInFlow
          goalId={goalId}
          onCancel={() => setPhase("timing")}
          onComplete={(completed) => {
            setResult(completed);
            setPhase("result");
          }}
        />
      )}

      {phase === "result" && result && (
        <CheckInResultCard
          result={result}
          onDismiss={() => router.push("/today")}
          onRewards={() => router.push("/rewards")}
        />
      )}

      {phase !== "interview" && phase !== "result" && (
        <div className="flex gap-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void send()} className="flex-1 rounded-full border border-moss-200 bg-paper px-4 py-2 text-sm" placeholder="I’m stuck on…" />
          <button onClick={() => void send()} className="rounded-full bg-moss-700 px-4 py-2 text-sm font-medium text-paper">Send</button>
        </div>
      )}
    </div>
  );
}

export default function CoachPage() {
  return <Suspense><CoachChat /></Suspense>;
}
