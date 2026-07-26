/**
 * TinyWins API contract.
 *
 * FROZEN — reconciled against Person B's `src/lib/ui-data.ts` after the
 * goals pivot. B's UI was built first against its own local types; this
 * file is now the single source of truth and the API routes return exactly
 * these shapes. `ui-data.ts` types should match 1:1 (or import from here).
 *
 * Endpoint map (App Router routes under src/app/api/):
 *
 *   GET    /api/health                   -> { ok: true }
 *   GET    /api/onboarding/status        -> OnboardingStatusResponse
 *   POST   /api/onboarding               multipart FormData   -> OnboardingResponse
 *   GET    /api/goals                    -> GoalListResponse   { active, ended }
 *   POST   /api/goals                    CreateGoalRequest    -> GoalToday
 *   GET    /api/goals/today              -> GoalsTodayResponse (lazy penalty check runs here)
 *   POST   /api/goals/[id]/check-in      CheckInRequest       -> CheckInResponse
 *   POST   /api/coach/chat               CoachChatRequest     -> CoachChatResponse
 *   POST   /api/coach/feedback           CoachFeedbackRequest -> void
 *   GET    /api/rewards                  -> RewardsResponse
 *   POST   /api/rewards/[id]/redeem      -> RedeemResponse
 *   GET    /api/growth?goalId=           -> GrowthResponse     (per goal, not account-wide)
 *
 * Ownership: Person A implements goals/rewards/growth/onboarding routes and
 * the points engine. Person C implements coach/chat, coach/feedback, the
 * verifier used inside check-in, and traits.ts. Person B consumes everything.
 */

// ---------- Core entities ----------

export type Difficulty = 1 | 2 | 3;

export type Mood = "rough" | "low" | "okay" | "good" | "great";

export type CompanionMood = "content" | "proud" | "sleepy" | "worried";

export type RewardKind = "accessory" | "theme" | "skip-token";

/** Only daily cadence ships in the demo; the column supports weekly later. */
export type Cadence = "daily";

export interface CompanionState {
  level: number;
  xp: number;
  mood: CompanionMood;
}

/**
 * A Goal is open-ended (lose weight, buy a car, build a project, start a
 * startup — user's own words) and runs from startDate to endDate with
 * recurring check-ins against it.
 *
 * `todayStatus` / `periodDay` / `periodTotal` are derived per request, not
 * stored: "where does today sit inside this goal's run."
 */
export interface GoalToday {
  id: string;
  title: string;
  startDate: string; // ISO
  endDate: string; // ISO
  createdAt: string; // ISO
  cadence: Cadence;
  todayStatus: "due" | "done" | "missed";
  /** 1-based day index of today within the goal's run. */
  periodDay: number;
  /** Total days from startDate to endDate inclusive. */
  periodTotal: number;
}

export interface GoalSummary {
  id: string;
  title: string;
  startDate: string; // ISO
  endDate: string; // ISO
  createdAt: string; // ISO
  status: "active" | "ended";
}

/**
 * One missed-period deduction, surfaced when the lazy check runs.
 * `id` is the ledger row id — the UI dedupes notices on it so a refresh
 * doesn't re-announce the same penalty.
 */
export interface PenaltyNotice {
  id: string;
  goalId: string;
  goalTitle: string;
  daysMissed: number;
  pointsDeducted: number;
  newBalance: number;
}

// ---------- Requests / responses ----------

export interface GoalsTodayResponse {
  streakDays: number;
  pointsBalance: number;
  companion: CompanionState;
  /** Always present; empty array when nothing was deducted this call. */
  penaltiesApplied: PenaltyNotice[];
  goals: GoalToday[];
}

export interface GoalListResponse {
  active: GoalSummary[];
  ended: GoalSummary[];
}

export interface CreateGoalRequest {
  title: string;
  endDate: string; // ISO date
  cadence: Cadence;
}

export interface CoachChatRequest {
  message: string;
  goalId?: string;
  sessionId: string;
}

export interface CoachChatResponse {
  reply: string;
  microStep?: {
    description: string;
    timerSeconds: number;
  };
  /** True when the coach wants to ask whether to change its approach. */
  showApproachCheckIn?: boolean;
}

export interface CoachFeedbackRequest {
  goalId?: string;
  sessionId: string;
  approach: "direct" | "gentle" | "unchanged";
}

/**
 * Check-in answers. Exactly three elements, positionally:
 *   [0] what did you actually do today toward this goal
 *   [1] what was the hardest part
 *   [2] how did this feel — a Mood value, the honesty-check signal
 */
export type CheckInAnswers = [string, string, Mood];

export interface CheckInRequest {
  answers: CheckInAnswers;
}

export interface CheckInResponse {
  /** "rejected" is not emitted in P0 — see DESIGN.md F5. */
  verdict: "accepted" | "partial";
  verdictMessage: string;
  multiplier: number; // within VERIFIER_MULTIPLIER range
  pointsAwarded: number;
  newBalance: number;
  streakDays: number;
  companion: CompanionState;
}

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  kind: RewardKind;
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

/**
 * Onboarding is submitted as multipart FormData (not JSON) because it
 * carries the vision board image file:
 *   age, gender, habitToImprove, newHabitGoal, mood, visionBoard?
 */
export interface OnboardingResponse {
  imageUrl?: string;
  /** "unavailable" when vision analysis failed or the provider can't do images. */
  analysisStatus: "complete" | "unavailable";
}

export interface OnboardingStatusResponse {
  completed: boolean;
}

export interface TraitsProfile {
  age: number;
  gender: string;
  communicationStyle: "direct" | "encouraging" | "playful";
  motivationStyle: "achievement" | "support" | "competition";
  visionBoardThemes: string[];
  currentMood: Mood;
}

// ---------- Profile ----------

/**
 * Read-only view of what the app knows about the user. Deliberately shows
 * the adaptive traits back to them rather than hiding them: the coach
 * changes its behaviour based on these, so the user should be able to see
 * what it thinks.
 */
export interface ProfileResponse {
  onboarded: boolean;
  age?: number;
  gender?: string;
  habitToImprove?: string;
  newHabitGoal?: string;
  visionBoardImageUrl?: string;
  visionBoardThemes: string[];
  communicationStyle?: TraitsProfile["communicationStyle"];
  motivationStyle?: TraitsProfile["motivationStyle"];
  /** Most recent mood check-ins, newest first. */
  recentMoods: { mood: Mood; date: string }[];
  stats: {
    streakDays: number;
    pointsBalance: number;
    activeGoals: number;
    totalCheckIns: number;
  };
  companion: CompanionState;
}

// ---------- Growth dashboard (per goal) ----------

export interface GrowthResponse {
  goal: GoalSummary;
  summary: {
    checkInsDone: number;
    checkInsExpected: number;
    skips: number;
    netPoints: number;
  };
  /** One entry per elapsed day of the goal's run, oldest first. */
  pointsSeries: { date: string; earned: number; penalty: number }[];
  history: {
    date: string;
    status: "done" | "skipped" | "due" | "future";
    verdict?: "accepted" | "partial";
    points?: number;
  }[];
}

// ---------- Frozen economy constants (the points engine must use these) ----------

export const BASE_POINTS: Record<Difficulty, number> = {
  1: 10,
  2: 20,
  3: 40,
};

/** Goals created through the UI don't ask for difficulty; they all use this. */
export const DEFAULT_GOAL_DIFFICULTY: Difficulty = 2;

/** Anti-gaming: hard cap on points earnable per day. Mention it to judges. */
export const DAILY_POINT_CAP = 150;

/** Verifier effort multiplier range. partial -> min..1.5, accepted -> 1.5..max */
export const VERIFIER_MULTIPLIER = { min: 0.5, max: 2.0 };

/** Streak bonus: flat points added when a day's first check-in extends the streak. */
export const STREAK_BONUS = 5;

/** Points deducted per missed check-in period. */
export const DEFAULT_MISSED_PENALTY = 20;

/** Companion xp needed per level. */
export const XP_PER_LEVEL = 50;
