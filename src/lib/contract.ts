/**
 * TinyWins API contract.
 *
 * FROZEN — re-frozen for the pivot from flat tasks to open-ended Goals with
 * traits/onboarding and a growth dashboard. Changing it requires all three
 * agreeing out loud, then editing THIS file first, then updating the module
 * prompts that depend on it.
 *
 * Endpoint map (App Router routes under src/app/api/):
 *
 *   GET    /api/health                  -> { ok: true }
 *   GET    /api/onboarding              -> OnboardingStatusResponse
 *   POST   /api/onboarding              OnboardingRequest    -> OnboardingResponse
 *   GET    /api/goals                   -> GoalsResponse            (lazy penalty check runs here)
 *   POST   /api/goals                   CreateGoalRequest    -> Goal
 *   POST   /api/coach/chat              CoachChatRequest     -> CoachChatResponse
 *   POST   /api/goals/[id]/checkin      CheckInRequest       -> CheckInResponse
 *   GET    /api/rewards                 -> RewardsResponse
 *   POST   /api/rewards/[id]/redeem     -> RedeemResponse
 *   GET    /api/growth                  -> GrowthResponse
 *
 * Ownership: Person A implements goals/rewards/points/growth routes and the
 * onboarding route. Person C implements coach/chat, the verifier used inside
 * checkin, and traits.ts. Person B consumes everything across the UI.
 */

// ---------- Core entities ----------

export type Difficulty = 1 | 2 | 3;

export type Mood = "rough" | "low" | "okay" | "good" | "great";

/**
 * Goal replaces the old flat "Task". A Goal is open-ended (lose weight,
 * buy a car, build a project, start a startup — user's own words) and
 * runs from startDate to endDate with recurring check-ins against it.
 * `category` is intentionally free text, not an enum — goals are
 * user-defined, we don't want to gate them behind a fixed list.
 */
export interface Goal {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  status: "active" | "completed" | "abandoned";
  startDate: string; // ISO
  endDate: string; // ISO
  checkInFrequency: "daily" | "weekly";
  /** Points deducted per missed check-in period, set at goal creation. */
  penaltyPoints: number;
  lastCheckInAt?: string; // ISO — drives both streak calc and lazy penalty check
  createdAt: string; // ISO
}

export interface CompanionState {
  level: number;
  xp: number;
  mood: "content" | "proud" | "sleepy" | "worried";
}

/** Result of the lazy missed-day penalty check, surfaced whenever it runs. */
export interface PenaltyResult {
  goalId: string;
  missedPeriods: number;
  pointsLost: number;
}

// ---------- Requests / responses ----------

export interface GoalsResponse {
  goals: Goal[];
  streakDays: number;
  pointsBalance: number;
  companion: CompanionState;
  /** Populated if opening this page triggered a missed-day penalty. */
  penaltiesApplied?: PenaltyResult[];
}

export interface CreateGoalRequest {
  title: string;
  category: string;
  difficulty: Difficulty;
  startDate: string;
  endDate: string;
  checkInFrequency: "daily" | "weekly";
  penaltyPoints: number;
}

export interface CoachChatRequest {
  message: string;
  goalId?: string;
}

export interface CoachChatResponse {
  reply: string;
  /** Present when the coach proposes a 2-minute start for a goal's check-in. */
  microStep?: {
    description: string;
    timerSeconds: number;
  };
}

/** Answers to the completion micro-interview, plus the honesty-check feeling question. */
export interface CheckInRequest {
  answers: string[]; // exactly 2: "what did you do" / "hardest part"
  feeling: string; // free text: "how did completing this feel" — read by the verifier for consistency
}

export interface CheckInResponse {
  verdict: "accepted" | "partial" | "rejected";
  verdictMessage: string;
  multiplier: number; // within VERIFIER_MULTIPLIER range
  pointsAwarded: number;
  newBalance: number;
  streakDays: number;
  companion: CompanionState;
  penaltiesApplied?: PenaltyResult[];
}

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  kind: "theme" | "accessory" | "skip-token";
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

// ---------- Onboarding / traits ----------

export interface OnboardingRequest {
  age: number;
  gender: string;
  habitToImprove?: string;
  newHabitGoal?: string;
  visionBoardImage?: string; // base64 data URL
  mood: Mood;
}

export interface TraitsProfile {
  age: number;
  gender: string;
  communicationStyle: "direct" | "encouraging" | "playful";
  motivationStyle: "achievement" | "support" | "competition";
  visionBoardThemes: string[];
  currentMood: Mood;
}

export interface OnboardingResponse {
  traits: TraitsProfile;
}

export interface OnboardingStatusResponse {
  completed: boolean;
  traits?: TraitsProfile;
}

// ---------- Growth dashboard ----------

export interface GrowthPoint {
  date: string; // ISO day
  pointsBalance: number;
  checkedIn: boolean; // did a completed check-in happen this day
  missed: boolean; // was a penalty applied this day
}

export interface GrowthResponse {
  points: GrowthPoint[];
  currentStreak: number;
  longestStreak: number;
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

/** Default missed-day penalty suggested at goal creation; goals may override via penaltyPoints. */
export const DEFAULT_MISSED_PENALTY = 20;
