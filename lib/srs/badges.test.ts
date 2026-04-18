import { describe, expect, it } from "vitest";
import { badgeDocId, tiersToAward, type BadgeTier } from "./badges";

describe("badges", () => {
  it("awards nothing below the bronze threshold", () => {
    expect(tiersToAward(2, new Set())).toEqual([]);
  });

  it("awards bronze at level 3", () => {
    expect(tiersToAward(3, new Set())).toEqual(["bronze"]);
  });

  it("awards both bronze and silver when a skill jumps to level 5", () => {
    expect(tiersToAward(5, new Set())).toEqual(["bronze", "silver"]);
  });

  it("skips tiers already earned", () => {
    const earned = new Set<BadgeTier>(["bronze"]);
    expect(tiersToAward(5, earned)).toEqual(["silver"]);
  });

  it("awards gold at level 7", () => {
    expect(tiersToAward(7, new Set<BadgeTier>(["bronze", "silver"])))
      .toEqual(["gold"]);
  });

  it("returns deterministic badge doc ids", () => {
    expect(badgeDocId("add_within_20", "bronze")).toBe("add_within_20:bronze");
    expect(badgeDocId("add_within_20", "bronze")).toBe(
      badgeDocId("add_within_20", "bronze")
    );
  });
});
