/**
 * Skill-level badge tiers. Each skill can earn up to three badges:
 *   - Bronze at level 3
 *   - Silver at level 5
 *   - Gold   at level 7 (or via separate mastery signal)
 */

export type BadgeTier = "bronze" | "silver" | "gold";

export const BADGE_THRESHOLDS: Array<{ tier: BadgeTier; level: number }> = [
  { tier: "bronze", level: 3 },
  { tier: "silver", level: 5 },
  { tier: "gold", level: 7 },
];

/**
 * Given a skill's new level, return any tiers that should be awarded
 * now given the set of tiers already earned for that skill.
 */
export function tiersToAward(
  newLevel: number,
  alreadyEarned: ReadonlySet<BadgeTier>
): BadgeTier[] {
  const out: BadgeTier[] = [];
  for (const { tier, level } of BADGE_THRESHOLDS) {
    if (newLevel >= level && !alreadyEarned.has(tier)) out.push(tier);
  }
  return out;
}

/** Deterministic badge doc id so (skill, tier) stays unique. */
export function badgeDocId(skillTag: string, tier: BadgeTier): string {
  return `${skillTag}:${tier}`;
}
