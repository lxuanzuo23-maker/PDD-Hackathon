import { describe, it, expect } from "vitest";
import { formatDayLabel, bucketLedgerByDay, dayStatus } from "../src/lib/growth";

describe("formatDayLabel", () => {
  it("formats an ISO day as a short label", () => {
    expect(formatDayLabel("2026-07-20")).toBe("Jul 20");
  });

  it("strips leading zeros from the day", () => {
    expect(formatDayLabel("2026-01-05")).toBe("Jan 5");
  });

  it("returns the input unchanged when it isn't parseable", () => {
    expect(formatDayLabel("nonsense")).toBe("nonsense");
  });
});

describe("bucketLedgerByDay", () => {
  it("separates earned from penalty and reports penalties as positive", () => {
    const result = bucketLedgerByDay([
      { date: "2026-07-20", amount: 20 },
      { date: "2026-07-20", amount: 5 },
      { date: "2026-07-22", amount: -40 },
    ]);
    expect(result.get("2026-07-20")).toEqual({ earned: 25, penalty: 0 });
    expect(result.get("2026-07-22")).toEqual({ earned: 0, penalty: 40 });
  });

  it("returns an empty map for no entries", () => {
    expect(bucketLedgerByDay([]).size).toBe(0);
  });
});

describe("dayStatus", () => {
  const today = "2026-07-25";
  const checkedIn = new Set(["2026-07-23"]);

  it("marks a day with a check-in as done, even in the past", () => {
    expect(dayStatus("2026-07-23", today, checkedIn)).toBe("done");
  });

  it("marks a past day with no check-in as skipped", () => {
    expect(dayStatus("2026-07-22", today, checkedIn)).toBe("skipped");
  });

  it("marks today with no check-in as due, not skipped", () => {
    expect(dayStatus(today, today, checkedIn)).toBe("due");
  });

  it("marks a later day as future", () => {
    expect(dayStatus("2026-07-28", today, checkedIn)).toBe("future");
  });
});
