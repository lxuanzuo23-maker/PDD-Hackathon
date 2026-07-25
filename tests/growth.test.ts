import { describe, it, expect } from "vitest";
import { longestStreak, buildRunningBalance } from "../src/lib/growth";

describe("longestStreak", () => {
  it("returns 0 for no check-ins", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("finds a run of consecutive days", () => {
    const days = ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-24"];
    expect(longestStreak(days)).toBe(3);
  });

  it("dedupes same-day entries without inflating the streak", () => {
    const days = ["2026-07-20", "2026-07-20", "2026-07-21"];
    expect(longestStreak(days)).toBe(2);
  });

  it("handles unsorted input", () => {
    const days = ["2026-07-22", "2026-07-20", "2026-07-21"];
    expect(longestStreak(days)).toBe(3);
  });
});

describe("buildRunningBalance", () => {
  it("carries a starting balance forward across days with no activity", () => {
    const result = buildRunningBalance([], ["2026-07-20", "2026-07-21"], 40);
    expect(result).toEqual([40, 40]);
  });

  it("accumulates same-day entries and carries the running total forward", () => {
    const entries = [
      { date: "2026-07-20", amount: 20 },
      { date: "2026-07-20", amount: 5 },
      { date: "2026-07-22", amount: -10 },
    ];
    const days = ["2026-07-20", "2026-07-21", "2026-07-22"];
    expect(buildRunningBalance(entries, days, 0)).toEqual([25, 25, 15]);
  });
});
