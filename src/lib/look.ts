/**
 * look.ts — pure derivation of the companion's appearance from what the
 * user has redeemed. No I/O, no Prisma: same discipline as points.ts.
 *
 * The companion's look is never stored as its own state. It is always
 * derived from redemptions, so the avatar can't drift out of sync with what
 * the user actually paid for.
 */

export interface RedeemedItem {
  rewardItemId: string;
  kind: string;
  emoji: string;
  themeKey: string | null;
  redeemedAt: Date;
}

export interface OwnedRewardSummary {
  rewardItemId: string;
  count: number;
  firstRedeemedAt: string;
}

export interface Look {
  accessories: string[];
  themeEmoji?: string;
  themeKey?: "meadow" | "dusk" | "sunrise";
}

const VALID_THEME_KEYS = ["meadow", "dusk", "sunrise"] as const;
type ValidThemeKey = (typeof VALID_THEME_KEYS)[number];

function isValidThemeKey(value: string | null): value is ValidThemeKey {
  return value !== null && (VALID_THEME_KEYS as readonly string[]).includes(value);
}

/**
 * Groups redemptions per item, counting duplicates and keeping the earliest
 * redemption date (that's the "when did I earn this" the collection shows).
 */
export function summarizeOwned(redemptions: RedeemedItem[]): OwnedRewardSummary[] {
  const byItem = new Map<string, { count: number; first: Date }>();

  for (const r of redemptions) {
    const existing = byItem.get(r.rewardItemId);
    if (!existing) {
      byItem.set(r.rewardItemId, { count: 1, first: r.redeemedAt });
      continue;
    }
    existing.count += 1;
    if (r.redeemedAt < existing.first) existing.first = r.redeemedAt;
  }

  return Array.from(byItem.entries())
    .map(([rewardItemId, { count, first }]) => ({
      rewardItemId,
      count,
      firstRedeemedAt: first.toISOString(),
    }))
    .sort((a, b) => a.firstRedeemedAt.localeCompare(b.firstRedeemedAt));
}

const MAX_WORN_ACCESSORIES = 4;

/**
 * Builds the companion's look.
 *
 * - Accessories are worn oldest-first and deduped: redeeming the same hat
 *   twice shouldn't stack two hats on the sprite.
 * - Capped at `MAX_WORN_ACCESSORIES` so a heavy spender doesn't bury the
 *   companion under emoji.
 * - The most recently redeemed theme wins, so buying a new theme visibly
 *   replaces the old backdrop rather than silently doing nothing.
 * - `skip-token` is intentionally not worn: it's an inventory item, not an
 *   outfit. It still appears in the sticker collection.
 */
export function buildLook(redemptions: RedeemedItem[]): Look {
  const sorted = [...redemptions].sort(
    (a, b) => a.redeemedAt.getTime() - b.redeemedAt.getTime()
  );

  const accessories: string[] = [];
  for (const r of sorted) {
    if (r.kind !== "accessory") continue;
    if (!r.emoji) continue;
    if (accessories.includes(r.emoji)) continue;
    accessories.push(r.emoji);
    if (accessories.length >= MAX_WORN_ACCESSORIES) break;
  }

  const look: Look = { accessories };

  const latestTheme = [...sorted]
    .reverse()
    .find((r) => r.kind === "theme" && isValidThemeKey(r.themeKey));
  if (latestTheme && isValidThemeKey(latestTheme.themeKey)) {
    look.themeKey = latestTheme.themeKey;
    if (latestTheme.emoji) look.themeEmoji = latestTheme.emoji;
  }

  return look;
}
