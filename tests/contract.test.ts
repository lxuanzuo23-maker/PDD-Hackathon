import { describe, expect, it } from "vitest";
import {
  BASE_POINTS,
  DAILY_POINT_CAP,
  STREAK_BONUS,
  VERIFIER_MULTIPLIER,
} from "../src/lib/contract";

describe("frozen contract constants", () => {
  it("awards more points for harder tasks", () => {
    expect(BASE_POINTS[1]).toBeLessThan(BASE_POINTS[2]);
    expect(BASE_POINTS[2]).toBeLessThan(BASE_POINTS[3]);
  });

  it("daily cap allows a few hard tasks but blocks farming", () => {
    expect(DAILY_POINT_CAP).toBeGreaterThan(BASE_POINTS[3] * VERIFIER_MULTIPLIER.max);
    expect(DAILY_POINT_CAP).toBeLessThan(BASE_POINTS[3] * 10);
  });

  it("verifier multiplier range is sane", () => {
    expect(VERIFIER_MULTIPLIER.min).toBeGreaterThan(0);
    expect(VERIFIER_MULTIPLIER.min).toBeLessThan(1);
    expect(VERIFIER_MULTIPLIER.max).toBeLessThanOrEqual(2);
  });

  it("streak bonus is positive but small relative to task points", () => {
    expect(STREAK_BONUS).toBeGreaterThan(0);
    expect(STREAK_BONUS).toBeLessThan(BASE_POINTS[1]);
  });
});
