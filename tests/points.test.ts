import { describe, it, expect } from "vitest";
import { calculatePoints } from "../src/lib/points";

describe("calculatePoints", () => {
  it("awards base points at 1.0x multiplier with no streak", () => {
    const result = calculatePoints({
      difficulty: 2,
      multiplier: 1.0,
      streak: 0,
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
      streak: 0,
      pointsEarnedToday: 0,
    });
    expect(result.points).toBe(70);
  });

  it("caps the streak bonus at MAX_STREAK_BONUS", () => {
    const result = calculatePoints({
      difficulty: 1,
      multiplier: 1.0,
      streak: 100,
      pointsEarnedToday: 0,
    });
    expect(result.streakBonus).toBe(20);
  });

  it("enforces the daily cap (anti-gaming)", () => {
    const result = calculatePoints({
      difficulty: 3,
      multiplier: 2.0,
      streak: 0,
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
        streak: 0,
        pointsEarnedToday: 0,
      })
    ).toThrow();
  });
});
