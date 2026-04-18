import type { ReviewState } from "./leitner";
import { isDue } from "./leitner";

/**
 * Weighted session composition following zone-of-proximal-development:
 *   ~60% review (due items)
 *   ~25% current level (near the kid's current level)
 *   ~15% stretch (one level harder)
 *
 * Interleaving is handled by alternating math and spelling items in
 * the returned order when `interleave` is true.
 */

export interface SelectorInput {
  /** Review state rows for this kid, any domain. */
  reviewQueue: ReviewState[];
  /** Map of itemId → { difficulty, domain }, for level bucketing. */
  itemMeta: Record<string, { difficulty: number; domain: "math" | "spelling" }>;
  /** Kid's current level per domain (0–10). */
  currentLevel: { math: number; spelling: number };
  /** 0..1 split across domains. Should sum to ~1. */
  subjectMix: { math: number; spelling: number };
  /** Target session duration in seconds. ~30s/item avg for kids 6–10. */
  durationS: number;
  interleave: boolean;
  now: number;
}

export interface SelectedItem {
  itemId: string;
  domain: "math" | "spelling";
  reason: "review" | "current" | "stretch";
}

const SECONDS_PER_ITEM = 30;

export function pickSessionItems(input: SelectorInput): SelectedItem[] {
  const targetCount = Math.max(6, Math.floor(input.durationS / SECONDS_PER_ITEM));
  const reviewTarget = Math.round(targetCount * 0.6);
  const currentTarget = Math.round(targetCount * 0.25);
  const stretchTarget = Math.max(1, targetCount - reviewTarget - currentTarget);

  const mathCount = Math.round(targetCount * input.subjectMix.math);
  const spellCount = targetCount - mathCount;

  const byDomainBudget = { math: mathCount, spelling: spellCount };
  const byDomainPicked: Record<"math" | "spelling", SelectedItem[]> = {
    math: [],
    spelling: [],
  };

  // 1) Review items: due, oldest due first.
  const dueItems = input.reviewQueue
    .filter((r) => isDue(r, input.now) && input.itemMeta[r.itemId])
    .sort((a, b) => a.dueAt - b.dueAt);

  for (const r of dueItems) {
    const meta = input.itemMeta[r.itemId];
    const picked = byDomainPicked[meta.domain];
    if (picked.length >= byDomainBudget[meta.domain]) continue;
    if (picked.filter((p) => p.reason === "review").length >= domainShare(reviewTarget, byDomainBudget, meta.domain, targetCount)) continue;
    picked.push({ itemId: r.itemId, domain: meta.domain, reason: "review" });
  }

  // 2) Current-level items: items at the kid's exact current difficulty
  //    (we previously allowed ±1 which pulled in next-level items —
  //    e.g. level-1 kids were getting sub_within_20 questions that
  //    should only appear as stretch).
  const pickedIds = new Set<string>(
    [...byDomainPicked.math, ...byDomainPicked.spelling].map((p) => p.itemId)
  );

  for (const domain of ["math", "spelling"] as const) {
    const level = input.currentLevel[domain];
    const picked = byDomainPicked[domain];
    const want = byDomainBudget[domain] - picked.length;
    if (want <= 0) continue;

    const pool = Object.entries(input.itemMeta)
      .filter(([id, m]) => m.domain === domain && !pickedIds.has(id))
      .map(([id, m]) => ({ id, diff: m.difficulty }));

    const current = pool.filter((p) => p.diff === level);
    const stretch = pool.filter((p) => p.diff === level + 1 || p.diff === level + 2);

    const currentShare = Math.min(
      Math.round(currentTarget * domainFraction(byDomainBudget, domain, targetCount)),
      current.length,
      want
    );
    for (let i = 0; i < currentShare; i++) {
      picked.push({ itemId: current[i].id, domain, reason: "current" });
      pickedIds.add(current[i].id);
    }

    const remainingWant = byDomainBudget[domain] - picked.length;
    const stretchShare = Math.min(
      Math.round(stretchTarget * domainFraction(byDomainBudget, domain, targetCount)),
      stretch.length,
      remainingWant
    );
    for (let i = 0; i < stretchShare; i++) {
      if (pickedIds.has(stretch[i].id)) continue;
      picked.push({ itemId: stretch[i].id, domain, reason: "stretch" });
      pickedIds.add(stretch[i].id);
    }
  }

  // 3) Interleave if requested; otherwise keep domain blocks.
  const math = byDomainPicked.math;
  const spell = byDomainPicked.spelling;
  if (!input.interleave) return [...math, ...spell];

  const out: SelectedItem[] = [];
  const maxLen = Math.max(math.length, spell.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < math.length) out.push(math[i]);
    if (i < spell.length) out.push(spell[i]);
  }
  return out;
}

function domainFraction(
  budget: Record<"math" | "spelling", number>,
  domain: "math" | "spelling",
  total: number
): number {
  if (total === 0) return 0;
  return budget[domain] / total;
}

function domainShare(
  reasonTarget: number,
  budget: Record<"math" | "spelling", number>,
  domain: "math" | "spelling",
  total: number
): number {
  return Math.round(reasonTarget * domainFraction(budget, domain, total));
}
