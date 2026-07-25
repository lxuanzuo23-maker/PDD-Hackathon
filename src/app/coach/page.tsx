"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

interface CoachReply {
  reply: string;
  microStep?: string;
  timerSeconds?: number;
}

function CoachChat() {
  const taskId = useSearchParams().get("taskId") ?? undefined;
  const [messages, setMessages] = useState<{ from: "user" | "coach"; text: string }[]>([
    { from: "coach", text: "Hey — what's going on?" },
  ]);
  const [input, setInput] = useState("");
  const [microStep, setMicroStep] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<
    "idle" | "loading" | "ready" | "offline"
  >("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Prefetch the pep-talk audio when a micro-step lands; playback happens
  // only on the user's tap so browser autoplay rules never block it.
  useEffect(() => {
    if (!microStep) return;
    let cancelled = false;
    let url: string | null = null;
    setVoiceStatus("loading");
    setVoiceUrl(null);

    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: microStep }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("voice offline");
        const blob = await res.blob();
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setVoiceUrl(url);
        setVoiceStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setVoiceStatus("offline");
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [microStep]);

  function startTimer(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(seconds);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null || s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function send() {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    setMessages((m) => [...m, { from: "user", text }]);

    const res = await fetch("/api/coach/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, taskId }),
    });
    const reply: CoachReply = await res.json();

    setMessages((m) => [...m, { from: "coach", text: reply.reply }]);
    if (reply.microStep) {
      setMicroStep(reply.microStep);
      if (reply.timerSeconds) startTimer(reply.timerSeconds);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-moss-900">Coach</h1>

      <div className="space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.from === "coach"
                ? "bg-moss-50 rounded-2xl rounded-bl-sm p-3 text-sm max-w-[85%]"
                : "bg-moss-700 text-paper rounded-2xl rounded-br-sm p-3 text-sm max-w-[85%] ml-auto"
            }
          >
            {m.text}
          </div>
        ))}
      </div>

      {microStep && (
        <div className="bg-gold/20 border border-gold rounded-2xl p-4 text-center space-y-2">
          <p className="text-xs uppercase tracking-wide text-moss-700">2-minute start</p>
          <p className="font-medium text-moss-900">{microStep}</p>
          {secondsLeft !== null && (
            <p className="font-display text-3xl text-spark">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </p>
          )}
          {voiceStatus === "ready" && voiceUrl && (
            <button
              onClick={() => new Audio(voiceUrl).play()}
              className="text-xs underline text-moss-700"
            >
              🔊 Play pep talk
            </button>
          )}
          {voiceStatus === "offline" && (
            <p className="text-xs text-moss-700/60">voice offline</p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-full border border-moss-200 px-4 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="I'm stuck on..."
        />
        <button
          onClick={send}
          className="bg-moss-700 text-paper rounded-full px-4 py-2 text-sm font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// useSearchParams() must sit under a Suspense boundary to prerender.
export default function CoachPage() {
  return (
    <Suspense>
      <CoachChat />
    </Suspense>
  );
}
