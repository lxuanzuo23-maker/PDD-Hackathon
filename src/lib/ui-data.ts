"use client";

/**
 * Person B's temporary UI data boundary.
 *
 * Fixtures are never an automatic fallback: they run only when the public
 * fixture flag is explicitly enabled. Live API errors stay visible in the UI.
 * Person A/C can replace the route implementations without rewriting pages.
 */

import type { ProfileResponse } from "@/lib/contract";

export const isFixtureMode = process.env.NEXT_PUBLIC_UI_DATA_MODE === "fixture";

// Profile shape is imported from the frozen contract rather than redeclared
// here — redeclaring types locally is what caused the API/UI drift the team
// had to reconcile once already.
export type { ProfileResponse };

export type Mood = "rough" | "low" | "okay" | "good" | "great";
export type CompanionMood = "content" | "proud" | "sleepy" | "worried";
export type RewardKind = "accessory" | "theme" | "skip-token";

export interface Companion {
  level: number;
  xp: number;
  mood: CompanionMood;
}

export interface PenaltyNotice {
  id: string;
  goalId: string;
  goalTitle: string;
  daysMissed: number;
  pointsDeducted: number;
  newBalance: number;
}

export interface GoalToday {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  cadence: "daily";
  todayStatus: "due" | "done" | "missed";
  periodDay: number;
  periodTotal: number;
}

export interface GoalsTodayResponse {
  streakDays: number;
  pointsBalance: number;
  companion: Companion;
  penaltiesApplied: PenaltyNotice[];
  goals: GoalToday[];
}

export interface CheckInResult {
  verdict: "accepted" | "partial";
  verdictMessage: string;
  multiplier: number;
  pointsAwarded: number;
  newBalance: number;
  streakDays: number;
  companion: Companion;
}

export interface CoachReply {
  reply: string;
  microStep?: { description: string; timerSeconds: number };
  showApproachCheckIn?: boolean;
}

export interface GoalSummary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  status: "active" | "ended";
}

export interface GrowthResponse {
  goal: GoalSummary;
  summary: {
    checkInsDone: number;
    checkInsExpected: number;
    skips: number;
    netPoints: number;
  };
  pointsSeries: { date: string; earned: number; penalty: number }[];
  history: {
    date: string;
    status: "done" | "skipped" | "due" | "future";
    verdict?: "accepted" | "partial";
    points?: number;
  }[];
  room?: {
    events: {
      id: string;
      type: string;
      occurredAt: string;
      payload: Record<string, unknown>;
    }[];
    reflection?: { text?: string; generatedAt?: string; status: "ready" | "unavailable" };
  };
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  kind: RewardKind;
}

export interface RewardsResponse {
  items: Reward[];
  companion: Companion;
  pointsBalance: number;
}

const today = new Date().toISOString().slice(0, 10);
const fixtureGoals: GoalToday[] = [
  {
    id: "goal-startup",
    title: "Build my startup landing page",
    startDate: "2026-07-15",
    endDate: "2026-08-14",
    createdAt: "2026-07-20T09:00:00.000Z",
    cadence: "daily",
    todayStatus: "due",
    periodDay: 11,
    periodTotal: 31,
  },
  {
    id: "goal-walk",
    title: "Walk after work",
    startDate: "2026-07-20",
    endDate: "2026-08-18",
    createdAt: "2026-07-19T09:00:00.000Z",
    cadence: "daily",
    todayStatus: "done",
    periodDay: 6,
    periodTotal: 30,
  },
];

let fixtureBalance = 40;
let fixtureStreak = 3;
let fixtureCompanion: Companion = { level: 2, xp: 80, mood: "content" };

const fixtureRewards: Reward[] = [
  {
    id: "tiny-hat",
    name: "Tiny hat",
    description: "A small hat. Very dignified.",
    cost: 20,
    kind: "accessory",
  },
  {
    id: "meadow-theme",
    name: "Meadow theme",
    description: "A soft green backdrop for your companion.",
    cost: 30,
    kind: "theme",
  },
  {
    id: "skip-token",
    name: "Skip-a-day token",
    description: "Display-only in this demo.",
    cost: 50,
    kind: "skip-token",
  },
];

function onboardingComplete(): boolean {
  return typeof window !== "undefined" &&
    window.sessionStorage.getItem("tinywins-onboarding-complete") === "true";
}

function markOnboardingComplete() {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem("tinywins-onboarding-complete", "true");
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      message = body.error || message;
    } catch {
      // A status is sufficient when the error body is not JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function getOnboardingStatus(): Promise<{ completed: boolean }> {
  if (isFixtureMode) return { completed: onboardingComplete() };
  return fetchJson("/api/onboarding/status");
}

export async function submitOnboarding(
  formData: FormData
): Promise<{ imageUrl?: string; analysisStatus: "complete" | "unavailable" }> {
  if (isFixtureMode) {
    markOnboardingComplete();
    const file = formData.get("visionBoard");
    return {
      imageUrl: file instanceof File ? URL.createObjectURL(file) : undefined,
      analysisStatus: "complete",
    };
  }
  return fetchJson("/api/onboarding", { method: "POST", body: formData });
}

export async function getTodayGoals(): Promise<GoalsTodayResponse> {
  if (isFixtureMode) {
    return {
      streakDays: fixtureStreak,
      pointsBalance: fixtureBalance,
      companion: fixtureCompanion,
      penaltiesApplied: [],
      goals: [...fixtureGoals],
    };
  }
  return fetchJson("/api/goals/today");
}

export async function createGoal(input: {
  title: string;
  endDate: string;
}): Promise<GoalToday> {
  if (isFixtureMode) {
    const goal: GoalToday = {
      id: `goal-${Date.now()}`,
      title: input.title,
      startDate: today,
      endDate: input.endDate,
      createdAt: new Date().toISOString(),
      cadence: "daily",
      todayStatus: "due",
      periodDay: 1,
      periodTotal: 30,
    };
    fixtureGoals.unshift(goal);
    return goal;
  }
  return fetchJson("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, cadence: "daily" }),
  });
}

export async function submitGoalCheckIn(
  goalId: string,
  answers: [string, string, Mood]
): Promise<CheckInResult> {
  if (isFixtureMode) {
    const goal = fixtureGoals.find((item) => item.id === goalId);
    if (goal) goal.todayStatus = "done";
    const pointsAwarded = 35;
    fixtureBalance += pointsAwarded;
    fixtureStreak += 1;
    return {
      verdict: "accepted",
      verdictMessage: "You named a specific next win. That counts.",
      multiplier: 1.5,
      pointsAwarded,
      newBalance: fixtureBalance,
      streakDays: fixtureStreak,
      companion: fixtureCompanion,
    };
  }
  return fetchJson(`/api/goals/${goalId}/check-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
}

export async function sendCoachMessage(input: {
  message: string;
  goalId?: string;
  sessionId: string;
}): Promise<CoachReply> {
  if (isFixtureMode) {
    return {
      reply: "You do not need the whole plan right now. Start one small visible move.",
      microStep: {
        description: "Open the project and write one sentence for the headline.",
        timerSeconds: 120,
      },
    };
  }
  return fetchJson("/api/coach/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function sendCoachFeedback(input: {
  goalId?: string;
  sessionId: string;
  approach: "direct" | "gentle" | "unchanged";
}): Promise<void> {
  if (isFixtureMode) return;
  await fetchJson("/api/coach/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function getGrowthGoals(): Promise<GoalSummary[]> {
  if (isFixtureMode) {
    return fixtureGoals
      .map(({ id, title, startDate, endDate, createdAt }) => ({
        id,
        title,
        startDate,
        endDate,
        createdAt,
        status: "active" as const,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const result = await fetchJson<{ active: GoalSummary[]; ended: GoalSummary[] }>("/api/goals");
  return [...result.active, ...result.ended];
}

export async function getGrowth(goalId: string): Promise<GrowthResponse> {
  if (isFixtureMode) {
    const goal =
      (await getGrowthGoals()).find((item) => item.id === goalId) ??
      (await getGrowthGoals())[0];
    if (!goal) throw new Error("No goals available");
    return {
      goal,
      summary: { checkInsDone: 5, checkInsExpected: 11, skips: 1, netPoints: 82 },
      pointsSeries: [
        { date: "Jul 20", earned: 20, penalty: 0 },
        { date: "Jul 21", earned: 15, penalty: 0 },
        { date: "Jul 22", earned: 0, penalty: 10 },
        { date: "Jul 23", earned: 22, penalty: 0 },
        { date: "Jul 24", earned: 25, penalty: 0 },
        { date: "Jul 25", earned: 0, penalty: 0 },
      ],
      history: [
        { date: "Jul 20", status: "done", verdict: "accepted", points: 20 },
        { date: "Jul 21", status: "done", verdict: "partial", points: 15 },
        { date: "Jul 22", status: "skipped", points: -10 },
        { date: "Jul 23", status: "done", verdict: "accepted", points: 22 },
        { date: "Jul 24", status: "done", verdict: "accepted", points: 25 },
        { date: "Jul 25", status: "due" },
      ],
      room: {
        reflection: {
          status: "ready",
          text: "You keep returning to this goal even when the start feels heavy. Your clearest win is making the first move smaller, not waiting for more motivation.",
          generatedAt: new Date().toISOString(),
        },
        events: [
          { id: "event-goal", type: "goal.created", occurredAt: "2026-07-20T09:00:00.000Z", payload: { title: goal.title } },
          { id: "event-coach", type: "coach.highlight", occurredAt: "2026-07-22T09:00:00.000Z", payload: { microStep: "Open the project and write one headline." } },
          { id: "event-checkin", type: "checkin.completed", occurredAt: "2026-07-24T18:00:00.000Z", payload: { verdict: "accepted", pointsAwarded: 25, mood: "good" } },
        ],
      },
    };
  }
  return fetchJson(`/api/growth?goalId=${encodeURIComponent(goalId)}`);
}

export async function getProfile(): Promise<ProfileResponse> {
  if (isFixtureMode) {
    return {
      onboarded: true,
      age: 27,
      gender: "prefer not to say",
      habitToImprove: "Going to bed before midnight",
      newHabitGoal: "Ship something small every week",
      visionBoardThemes: ["fitness", "career growth", "calm"],
      communicationStyle: "encouraging",
      motivationStyle: "support",
      recentMoods: [
        { mood: "good", date: today },
        { mood: "okay", date: "2026-07-24" },
        { mood: "low", date: "2026-07-23" },
      ],
      stats: {
        streakDays: fixtureStreak,
        pointsBalance: fixtureBalance,
        activeGoals: fixtureGoals.length,
        totalCheckIns: 5,
      },
      companion: fixtureCompanion,
    };
  }
  return fetchJson("/api/profile");
}

export async function getRewards(): Promise<RewardsResponse> {
  if (isFixtureMode) {
    return {
      items: fixtureRewards,
      companion: fixtureCompanion,
      pointsBalance: fixtureBalance,
    };
  }
  return fetchJson("/api/rewards");
}

export async function redeemReward(
  rewardId: string
): Promise<{ ok: boolean; newBalance: number; companion: Companion }> {
  if (isFixtureMode) {
    const reward = fixtureRewards.find((item) => item.id === rewardId);
    if (!reward) throw new Error("Reward not found");
    if (fixtureBalance < reward.cost) throw new Error("Not enough points");
    fixtureBalance -= reward.cost;
    const previousLevel = fixtureCompanion.level;
    const xp = fixtureCompanion.xp + reward.cost;
    fixtureCompanion = {
      ...fixtureCompanion,
      xp,
      level: 1 + Math.floor(xp / 50),
      mood: previousLevel < 1 + Math.floor(xp / 50) ? "proud" : fixtureCompanion.mood,
    };
    return { ok: true, newBalance: fixtureBalance, companion: fixtureCompanion };
  }
  return fetchJson(`/api/rewards/${rewardId}/redeem`, { method: "POST" });
}
