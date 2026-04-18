import { describe, expect, it } from "vitest";
import {
  bucketBySkill,
  clampLevel,
  computeStars,
  computeStreak,
  proposeLevelDelta,
} from "./levelUpdate";

const DAY = 24 * 60 * 60 * 1000;

describe("levelUpdate", () => {
  it("buckets attempts by skill tag", () => {
    const b = bucketBySkill([
      { skillTag: "add_within_10", correct: true },
      { skillTag: "add_within_10", correct: false },
      { skillTag: "cvc_short_a", correct: true },
    ]);
    expect(b.add_within_10).toEqual({ correct: 1, total: 2 });
    expect(b.cvc_short_a).toEqual({ correct: 1, total: 1 });
  });

  it("needs at least MIN_ATTEMPTS before moving a level", () => {
    expect(proposeLevelDelta({ correct: 2, total: 2 })).toBe(0);
    expect(proposeLevelDelta({ correct: 3, total: 3 })).toBe(1);
  });

  it("bumps level up on >=80% accuracy", () => {
    expect(proposeLevelDelta({ correct: 4, total: 5 })).toBe(1);
    expect(proposeLevelDelta({ correct: 3, total: 4 })).toBe(0); // 75%
  });

  it("bumps level down on <=40% accuracy", () => {
    expect(proposeLevelDelta({ correct: 1, total: 5 })).toBe(-1);
    expect(proposeLevelDelta({ correct: 2, total: 5 })).toBe(-1); // 40%
    expect(proposeLevelDelta({ correct: 3, total: 5 })).toBe(0); // 60%
  });

  it("clamps level to [0, 10]", () => {
    expect(clampLevel(-5)).toBe(0);
    expect(clampLevel(15)).toBe(10);
    expect(clampLevel(5)).toBe(5);
  });

  it("awards stars by accuracy bands", () => {
    expect(computeStars([])).toBe(0);
    expect(
      computeStars([
        { skillTag: "x", correct: true },
        { skillTag: "x", correct: true },
        { skillTag: "x", correct: true },
        { skillTag: "x", correct: true },
        { skillTag: "x", correct: true },
      ])
    ).toBe(3);
    const mostly = Array.from({ length: 10 }, (_, i) => ({
      skillTag: "x",
      correct: i < 8, // 80%
    }));
    expect(computeStars(mostly)).toBe(2);
    expect(
      computeStars([
        { skillTag: "x", correct: true },
        { skillTag: "x", correct: false },
        { skillTag: "x", correct: false },
      ])
    ).toBe(1);
    expect(
      computeStars([
        { skillTag: "x", correct: false },
        { skillTag: "x", correct: false },
      ])
    ).toBe(0);
  });

  it("starts streak at 1 for a first session", () => {
    const r = computeStreak(0, undefined, Date.parse("2026-04-18"));
    expect(r).toEqual({ streak: 1, lastSessionDay: "2026-04-18" });
  });

  it("keeps streak on same-day sessions", () => {
    const r = computeStreak(
      5,
      "2026-04-18",
      Date.parse("2026-04-18T12:00:00Z")
    );
    expect(r).toEqual({ streak: 5, lastSessionDay: "2026-04-18" });
  });

  it("increments streak when yesterday had a session", () => {
    const r = computeStreak(3, "2026-04-17", Date.parse("2026-04-18"));
    expect(r).toEqual({ streak: 4, lastSessionDay: "2026-04-18" });
  });

  it("resets streak after a gap", () => {
    const r = computeStreak(5, "2026-04-10", Date.parse("2026-04-18"));
    expect(r).toEqual({ streak: 1, lastSessionDay: "2026-04-18" });
  });
});
