import { describe, it, expect } from "vitest";
import {
  advancedAnchor,
  dayRange,
  daysBetweenUTC,
  isSameUTCDay,
  missedPeriods,
  periodInfo,
  todayStatus,
} from "../src/lib/goals";

const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("daysBetweenUTC", () => {
  it("counts whole calendar days regardless of time of day", () => {
    expect(daysBetweenUTC(new Date("2026-07-20T23:00:00Z"), new Date("2026-07-21T01:00:00Z"))).toBe(1);
  });

  it("is negative when the second date precedes the first", () => {
    expect(daysBetweenUTC(utc("2026-07-25"), utc("2026-07-20"))).toBe(-5);
  });
});

describe("isSameUTCDay", () => {
  it("treats different times on one calendar day as the same day", () => {
    expect(isSameUTCDay(new Date("2026-07-20T00:01:00Z"), new Date("2026-07-20T23:59:00Z"))).toBe(true);
  });
});

describe("periodInfo", () => {
  const goal = { startDate: utc("2026-07-20"), endDate: utc("2026-08-18") };

  it("counts the run inclusively", () => {
    expect(periodInfo(goal, utc("2026-07-20")).periodTotal).toBe(30);
  });

  it("reports a 1-based day index", () => {
    expect(periodInfo(goal, utc("2026-07-25")).periodDay).toBe(6);
  });

  it("clamps a date before the start to day 1", () => {
    expect(periodInfo(goal, utc("2026-07-01")).periodDay).toBe(1);
  });

  it("clamps a date past the end to the final day", () => {
    const info = periodInfo(goal, utc("2026-09-30"));
    expect(info.periodDay).toBe(info.periodTotal);
  });
});

describe("todayStatus", () => {
  const base = { startDate: utc("2026-07-20"), endDate: utc("2026-08-18") };

  it("is done when the goal was checked in today", () => {
    expect(todayStatus({ ...base, lastCheckInAt: utc("2026-07-25") }, utc("2026-07-25"))).toBe("done");
  });

  it("is due when today has no check-in yet", () => {
    expect(todayStatus({ ...base, lastCheckInAt: utc("2026-07-24") }, utc("2026-07-25"))).toBe("due");
  });

  it("stays due after a skipped yesterday, so the goal remains actionable", () => {
    // Regression guard: "missed" renders no action buttons in the UI, so a
    // skipped yesterday must never block checking in today.
    expect(todayStatus({ ...base, lastCheckInAt: utc("2026-07-20") }, utc("2026-07-25"))).toBe("due");
  });

  it("is missed only once the run has ended", () => {
    expect(todayStatus({ ...base, lastCheckInAt: null }, utc("2026-08-25"))).toBe("missed");
  });
});

describe("missedPeriods", () => {
  const base = { startDate: utc("2026-07-01"), endDate: utc("2026-08-18") };

  it("does not count the still-open current day", () => {
    expect(missedPeriods({ ...base, lastCheckInAt: utc("2026-07-24") }, utc("2026-07-25"))).toBe(0);
  });

  it("counts full days skipped since the last check-in", () => {
    expect(missedPeriods({ ...base, lastCheckInAt: utc("2026-07-20") }, utc("2026-07-25"))).toBe(4);
  });

  it("falls back to the start date when never checked in", () => {
    expect(missedPeriods({ ...base, lastCheckInAt: null }, utc("2026-07-05")).valueOf()).toBe(3);
  });

  it("stops accruing after the goal's end date", () => {
    const ended = { startDate: utc("2026-07-01"), endDate: utc("2026-07-10"), lastCheckInAt: utc("2026-07-08") };
    // Long after the run ended, only the days inside the run are charged.
    expect(missedPeriods(ended, utc("2026-09-01"))).toBe(1);
  });
});

describe("advancedAnchor", () => {
  it("moves the anchor forward by the periods charged", () => {
    const next = advancedAnchor(utc("2026-07-20"), 4);
    expect(next.toISOString().slice(0, 10)).toBe("2026-07-24");
  });
});

describe("dayRange", () => {
  it("includes both endpoints", () => {
    expect(dayRange(utc("2026-07-20"), utc("2026-07-23"))).toEqual([
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
    ]);
  });

  it("returns a single day when start and end match", () => {
    expect(dayRange(utc("2026-07-20"), utc("2026-07-20"))).toEqual(["2026-07-20"]);
  });
});
