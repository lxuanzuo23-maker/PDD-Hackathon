import { describe, it, expect } from "vitest";
import { calculatePoints, calculateMissedDayPenalty } from "../src/lib/points";

describe("calculatePoints", () => {
  it("awards base points at 1.0x multiplier, not first check-in today", () => {
    const result = calculatePoints({
      difficulty: 2,
      multiplier: 1.0,
      isFirstToday: false,
      pointsEarnedToday: 0,
    });
    expect(result.points).toBe(20);
    expect(result.streakBonus).toBe(0);
    expect(result.cappedByDailyLimit).toBe(false);
  });

  it("applies the effort multiplier", () => {
    const result = calculatePoints({
      difficulty: 3,
      multiplier: 2.0,
      isFirstToday: false,
      pointsEarnedToday: 0,
    });
    expect(result.points).toBe(80);
  });

  it("adds a flat +5 streak bonus only when isFirstToday is true", () => {
    const result = calculatePoints({
      difficulty: 1,
      multiplier: 1.0,
      isFirstToday: true,
      pointsEarnedToday: 0,
    });
    expect(result.streakBonus).toBe(5);
    expect(result.points).toBe(15);
  });

  it("enforces the daily cap (anti-gaming)", () => {
    const result = calculatePoints({
      difficulty: 3,
      multiplier: 2.0,
      isFirstToday: false,
      pointsEarnedToday: 140,
    });
    expect(result.points).toBe(10);
    expect(result.cappedByDailyLimit).toBe(true);
  });

  it("rejects an out-of-range multiplier", () => {
    expect(() =>
      calculatePoints({
        difficulty: 1,
        multiplier: 3.0,
        isFirstToday: false,
        pointsEarnedToday: 0,
      })
    ).toThrow();
  });
});

describe("calculateMissedDayPenalty", () => {
  it("multiplies penalty per period by missed periods", () => {
    const result = calculateMissedDayPenalty({
      penaltyPerPeriod: 20,
      missedPeriods: 3,
    });
    expect(result.pointsLost).toBe(60);
  });

  it("returns zero loss when nothing was missed", () => {
    const result = calculateMissedDayPenalty({
      penaltyPerPeriod: 20,
      missedPeriods: 0,
    });
    expect(result.pointsLost).toBe(0);
  });

  it("is not affected by the daily earnings cap", () => {
    // Penalties aren't earnings — a large miss should not be silently
    // softened the way calculatePoints softens overflow earnings.
    const result = calculateMissedDayPenalty({
      penaltyPerPeriod: 50,
      missedPeriods: 5,
    });
    expect(result.pointsLost).toBe(250);
  });
});
