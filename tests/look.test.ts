import { describe, it, expect } from "vitest";
import { buildLook, summarizeOwned, type RedeemedItem } from "../src/lib/look";

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

const hat: RedeemedItem = {
  rewardItemId: "hat",
  kind: "accessory",
  emoji: "🎩",
  themeKey: null,
  redeemedAt: at("2026-07-20"),
};
const scarf: RedeemedItem = {
  rewardItemId: "scarf",
  kind: "accessory",
  emoji: "🧣",
  themeKey: null,
  redeemedAt: at("2026-07-21"),
};
const meadow: RedeemedItem = {
  rewardItemId: "meadow",
  kind: "theme",
  emoji: "🌿",
  themeKey: "meadow",
  redeemedAt: at("2026-07-22"),
};
const dusk: RedeemedItem = {
  rewardItemId: "dusk",
  kind: "theme",
  emoji: "🌆",
  themeKey: "dusk",
  redeemedAt: at("2026-07-23"),
};
const token: RedeemedItem = {
  rewardItemId: "token",
  kind: "skip-token",
  emoji: "🛡️",
  themeKey: null,
  redeemedAt: at("2026-07-24"),
};

describe("buildLook", () => {
  it("returns an empty look for a user who has redeemed nothing", () => {
    expect(buildLook([])).toEqual({ accessories: [] });
  });

  it("wears accessories oldest first", () => {
    expect(buildLook([scarf, hat]).accessories).toEqual(["🎩", "🧣"]);
  });

  it("does not stack a duplicate accessory on the sprite", () => {
    const again = { ...hat, redeemedAt: at("2026-07-25") };
    expect(buildLook([hat, again]).accessories).toEqual(["🎩"]);
  });

  it("caps worn accessories so the companion isn't buried", () => {
    const many: RedeemedItem[] = ["🎩", "🧣", "🕶️", "🎀", "👑", "🧢"].map((emoji, i) => ({
      rewardItemId: `a${i}`,
      kind: "accessory",
      emoji,
      themeKey: null,
      redeemedAt: at("2026-07-20"),
    }));
    expect(buildLook(many).accessories).toHaveLength(4);
  });

  it("applies the most recently redeemed theme so a new theme visibly replaces the old", () => {
    const look = buildLook([meadow, dusk]);
    expect(look.themeKey).toBe("dusk");
    expect(look.themeEmoji).toBe("🌆");
  });

  it("ignores a theme with an unrecognized key instead of rendering a broken backdrop", () => {
    const bogus = { ...meadow, themeKey: "vaporwave" };
    expect(buildLook([bogus]).themeKey).toBeUndefined();
  });

  it("does not wear a skip-token — it's inventory, not an outfit", () => {
    expect(buildLook([token]).accessories).toEqual([]);
  });

  it("does not mutate the input array's order", () => {
    const input = [scarf, hat];
    buildLook(input);
    expect(input[0]).toBe(scarf);
  });
});

describe("summarizeOwned", () => {
  it("returns nothing for no redemptions", () => {
    expect(summarizeOwned([])).toEqual([]);
  });

  it("counts duplicates and keeps the earliest date", () => {
    const again = { ...hat, redeemedAt: at("2026-07-25") };
    const [entry] = summarizeOwned([again, hat]);
    expect(entry.count).toBe(2);
    expect(entry.firstRedeemedAt.slice(0, 10)).toBe("2026-07-20");
  });

  it("orders the collection by when each item was first earned", () => {
    const ids = summarizeOwned([token, hat, meadow]).map((o) => o.rewardItemId);
    expect(ids).toEqual(["hat", "meadow", "token"]);
  });
});
