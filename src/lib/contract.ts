/**
 * TinyWins API contract.
 *
 * FROZEN at T+0:30. This file is the interface between all three people.
 * Changing it requires all three agreeing out loud, then editing THIS file first,
 * then updating the module prompts that depend on it.
 *
 * Endpoint map (App Router routes under src/app/api/):
 *
 *   GET    /api/health                  -> { ok: true }
 *   GET    /api/tasks                   -> TodayResponse
 *   POST   /api/tasks                   CreateTaskRequest    -> Task
 *   POST   /api/coach/chat              CoachChatRequest     -> CoachChatResponse
 *   POST   /api/tasks/[id]/complete     CompleteTaskRequest  -> CompleteTaskResponse
 *   GET    /api/rewards                 -> RewardsResponse
 *   POST   /api/rewards/[id]/redeem     -> RedeemResponse
 *
 * Ownership: Person A implements tasks/rewards/points routes. Person C implements
 * coach/chat and the verifier used inside complete. Person B consumes everything.
 */

// ---------- Core entities ----------

export type Difficulty = 1 | 2 | 3;

export interface Task {
  id: string;
  title: string;
  difficulty: Difficulty;
  status: "open" | "done";
  createdAt: string; // ISO
  completedAt?: string; // ISO
}

export interface CompanionState {
  level: number;
  xp: number;
  mood: "happy" | "neutral" | "worried";
}

// ---------- Requests / responses ----------

export interface TodayResponse {
  tasks: Task[];
  streakDays: number;
  pointsBalance: number;
  companion: CompanionState;
}

export interface CreateTaskRequest {
  title: string;
  difficulty: Difficulty;
}

export interface CoachChatRequest {
  message: string;
  taskId?: string;
}

export interface CoachChatResponse {
  reply: string;
  /** Present when the coach proposes a 2-minute start for a task. */
  microStep?: {
    description: string;
    timerSeconds: number;
  };
}

/** Answers to the completion micro-interview (2 questions). */
export interface CompleteTaskRequest {
  answers: string[];
}

export interface CompleteTaskResponse {
  verdict: "accepted" | "partial" | "rejected";
  multiplier: number; // within VERIFIER_MULTIPLIER range
  pointsAwarded: number;
  newBalance: number;
  streakDays: number;
  companion: CompanionState;
}

export interface RewardItem {
  id: string;
  name: string;
  cost: number;
  kind: "companion" | "theme" | "streak-shield";
}

export interface RewardsResponse {
  items: RewardItem[];
  companion: CompanionState;
  pointsBalance: number;
}

export interface RedeemResponse {
  ok: boolean;
  newBalance: number;
  companion: CompanionState;
}

// ---------- Frozen economy constants (Person A's points engine must use these) ----------

export const BASE_POINTS: Record<Difficulty, number> = {
  1: 10,
  2: 20,
  3: 40,
};

/** Anti-gaming: hard cap on points earnable per day. Mention it to judges. */
export const DAILY_POINT_CAP = 150;

/** Verifier effort multiplier range. rejected -> 0, partial -> min..1, accepted -> 1..max */
export const VERIFIER_MULTIPLIER = { min: 0.5, max: 2.0 };

/** Streak bonus: flat points added when a day's first completion extends the streak. */
export const STREAK_BONUS = 5;
