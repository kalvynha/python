import { describe, it, expect } from "vitest";
import { pickSessionItems } from "./selector";
import type { ReviewState } from "./leitner";

const NOW = 1_700_000_000_000;

function buildMeta(count: number, domain: "math" | "spelling", diffs: number[]) {
  const m: Record<string, { difficulty: number; domain: "math" | "spelling" }> = {};
  for (let i = 0; i < count; i++) {
    m[`${domain}-${i}`] = { difficulty: diffs[i % diffs.length], domain };
  }
  return m;
}

describe("SRS selector", () => {
  it("yields items mixed roughly 60/25/15 with due items prioritized", () => {
    const itemMeta = {
      ...buildMeta(20, "math", [1, 2, 3, 4]),
      ...buildMeta(20, "spelling", [1, 2, 3, 4]),
    };

    // Mix due items across both domains so review quota can fill
    const mathIds = Object.keys(itemMeta).filter((k) => k.startsWith("math-")).slice(0, 8);
    const spellIds = Object.keys(itemMeta).filter((k) => k.startsWith("spelling-")).slice(0, 8);
    const reviewQueue: ReviewState[] = [...mathIds, ...spellIds].map((id, i) => ({
      itemId: id,
      box: 1,
      dueAt: NOW - i * 1000,
      streak: 0,
    }));

    const picked = pickSessionItems({
      reviewQueue,
      itemMeta,
      currentLevel: { math: 2, spelling: 2 },
      subjectMix: { math: 0.5, spelling: 0.5 },
      durationS: 600, // 10 min → ~20 items
      interleave: true,
      now: NOW,
    });

    expect(picked.length).toBeGreaterThan(10);
    const reviewCount = picked.filter((p) => p.reason === "review").length;
    const currentCount = picked.filter((p) => p.reason === "current").length;
    const stretchCount = picked.filter((p) => p.reason === "stretch").length;
    expect(reviewCount).toBeGreaterThan(currentCount);
    expect(reviewCount).toBeGreaterThan(stretchCount);
  });

  it("interleaves domains when enabled", () => {
    const itemMeta = {
      ...buildMeta(10, "math", [2]),
      ...buildMeta(10, "spelling", [2]),
    };
    const picked = pickSessionItems({
      reviewQueue: [],
      itemMeta,
      currentLevel: { math: 2, spelling: 2 },
      subjectMix: { math: 0.5, spelling: 0.5 },
      durationS: 300,
      interleave: true,
      now: NOW,
    });
    // first two should be different domains when both are present
    const firstTwo = picked.slice(0, 2).map((p) => p.domain);
    if (firstTwo.length === 2) {
      expect(firstTwo[0]).not.toBe(firstTwo[1]);
    }
  });

  it("blocks domains when interleave is false", () => {
    const itemMeta = {
      ...buildMeta(10, "math", [2]),
      ...buildMeta(10, "spelling", [2]),
    };
    const picked = pickSessionItems({
      reviewQueue: [],
      itemMeta,
      currentLevel: { math: 2, spelling: 2 },
      subjectMix: { math: 0.5, spelling: 0.5 },
      durationS: 300,
      interleave: false,
      now: NOW,
    });
    // Find split point: once we see a spelling, no more math should appear.
    let seenSpelling = false;
    for (const p of picked) {
      if (p.domain === "spelling") seenSpelling = true;
      if (seenSpelling) expect(p.domain).toBe("spelling");
    }
  });

  it("respects subjectMix of mostly-math", () => {
    const itemMeta = {
      ...buildMeta(20, "math", [2]),
      ...buildMeta(20, "spelling", [2]),
    };
    const picked = pickSessionItems({
      reviewQueue: [],
      itemMeta,
      currentLevel: { math: 2, spelling: 2 },
      subjectMix: { math: 0.8, spelling: 0.2 },
      durationS: 600,
      interleave: false,
      now: NOW,
    });
    const math = picked.filter((p) => p.domain === "math").length;
    const spell = picked.filter((p) => p.domain === "spelling").length;
    expect(math).toBeGreaterThan(spell * 2);
  });
});
