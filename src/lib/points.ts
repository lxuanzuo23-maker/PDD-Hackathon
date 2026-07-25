/**
 * points.ts — pure points-engine logic. No I/O, no Prisma: this file takes
 * plain numbers in and returns plain numbers out, which is what makes it
 * trivially unit-testable (tests/points.test.ts).
 *
 * Formula (mention the daily cap to judges — it's the anti-gaming story):
 *   points = min(base(difficulty) * multiplier + streakBonus, dailyCap - alreadyEarnedToday)
 */

const BASE_POINTS_BY_DIFFICULTY: Record<1 | 2 | 3, number> = {
  1: 10,
  2: 20,
  3: 35,
};

const STREAK_BONUS_PER_DAY = 2;
const MAX_STREAK_BONUS = 20;
const DAILY_POINTS_CAP = 150;

export interface PointsInput {
  difficulty: 1 | 2 | 3;
  /** Verifier's effort/plausibility multiplier, 0.5x - 2.0x. */
  multiplier: number;
  /** User's current streak length in days. */
  streak: number;
  /** Points already earned today, before this task — enforces the cap. */
  pointsEarnedToday: number;
}

export interface PointsResult {
  points: number;
  streakBonus: number;
  cappedByDailyLimit: boolean;
}

export function calculatePoints(input: PointsInput): PointsResult {
  const { difficulty, multiplier, streak, pointsEarnedToday } = input;

  if (multiplier < 0.5 || multiplier > 2.0) {
    throw new Error(`multiplier must be between 0.5 and 2.0, got ${multiplier}`);
  }

  const base = BASE_POINTS_BY_DIFFICULTY[difficulty];
  const streakBonus = Math.min(streak * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS);
  const rawPoints = Math.round(base * multiplier + streakBonus);

  const remainingBudget = Math.max(DAILY_POINTS_CAP - pointsEarnedToday, 0);
  const points = Math.min(rawPoints, remainingBudget);

  return {
    points,
    streakBonus,
    cappedByDailyLimit: rawPoints > remainingBudget,
  };
}
