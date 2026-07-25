import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("Person B UI data boundary", () => {
  it("uses visibly enabled fixtures with more than one active goal", async () => {
    vi.stubEnv("NEXT_PUBLIC_UI_DATA_MODE", "fixture");
    const data = await import("../src/lib/ui-data");

    const today = await data.getTodayGoals();

    expect(data.isFixtureMode).toBe(true);
    expect(today.goals.length).toBeGreaterThan(1);
    expect(today.goals.every((goal) => goal.cadence === "daily")).toBe(true);
  });

  it("does not silently replace a live API error with fixture data", async () => {
    vi.stubEnv("NEXT_PUBLIC_UI_DATA_MODE", "live");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
        json: async () => ({ error: "Goals service offline" }),
      }))
    );
    const data = await import("../src/lib/ui-data");

    await expect(data.getTodayGoals()).rejects.toThrow("Goals service offline");
  });
});
