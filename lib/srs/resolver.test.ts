import { describe, expect, it } from "vitest";
import { resolveSessionItems, type ResolverItemMeta } from "./resolver";
import type { SelectedItem } from "./selector";

const SEED = 123;

describe("resolveSessionItems", () => {
  it("procedurally generates math items from the skill tag", () => {
    const picks: SelectedItem[] = [
      { itemId: "math:add_within_10:42:0", domain: "math", reason: "current" },
    ];
    const itemMeta: Record<string, ResolverItemMeta> = {
      "math:add_within_10:42:0": {
        skillTag: "add_within_10",
        domain: "math",
        difficulty: 1,
      },
    };

    const r = resolveSessionItems({ picks, itemMeta, sessionSeed: SEED });
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0].type).toBe("math_arith");
    expect(r.problems[0].skillTag).toBe("add_within_10");
    expect(r.problems[0].prompt).toMatch(/\d+ \+ \d+/);
    expect(r.problems[0].expected).toMatch(/^\d+$/);
    expect(r.problems[0].hintLadder.length).toBeGreaterThan(0);
    expect(r.source).toEqual({ procedural: 1, inventory: 0 });
    expect(r.unresolvedPicks).toHaveLength(0);
  });

  it("uses inventory item for spelling pick when meta is complete", () => {
    const picks: SelectedItem[] = [
      { itemId: "spell:cvc_short_a:cat:audio", domain: "spelling", reason: "review" },
    ];
    const itemMeta: Record<string, ResolverItemMeta> = {
      "spell:cvc_short_a:cat:audio": {
        skillTag: "cvc_short_a",
        domain: "spelling",
        difficulty: 1,
        prompt: "cat",
        expected: "cat",
        sentence: "The cat is on the mat.",
        hintLadder: ["starts with c"],
        type: "spelling_audio",
      },
    };

    const r = resolveSessionItems({ picks, itemMeta, sessionSeed: SEED });
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0].prompt).toBe("cat");
    expect(r.problems[0].expected).toBe("cat");
    expect(r.problems[0].sentence).toContain("cat");
    expect(r.source).toEqual({ procedural: 0, inventory: 1 });
  });

  it("falls back to curated word bank when inventory entry is missing fields", () => {
    const picks: SelectedItem[] = [
      { itemId: "spell:cvc_short_i:pig:audio", domain: "spelling", reason: "current" },
    ];
    const itemMeta: Record<string, ResolverItemMeta> = {
      "spell:cvc_short_i:pig:audio": {
        skillTag: "cvc_short_i",
        domain: "spelling",
        difficulty: 1,
        // prompt/expected/hintLadder missing → should fall back to
        // procedural generation against SPELLING_WORDS.
      },
    };

    const r = resolveSessionItems({ picks, itemMeta, sessionSeed: SEED });
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0].skillTag).toBe("cvc_short_i");
    expect(r.problems[0].prompt.length).toBeGreaterThan(0);
    expect(r.problems[0].expected).toBe(r.problems[0].prompt);
    expect(r.source).toEqual({ procedural: 1, inventory: 0 });
  });

  it("flags picks with no skill tag as unresolved", () => {
    const picks: SelectedItem[] = [
      { itemId: "ghost", domain: "math", reason: "stretch" },
    ];
    const r = resolveSessionItems({ picks, itemMeta: {}, sessionSeed: SEED });
    expect(r.problems).toHaveLength(0);
    expect(r.unresolvedPicks).toHaveLength(1);
  });

  it("flags picks with unknown skill tags as unresolved", () => {
    const picks: SelectedItem[] = [
      { itemId: "math:made_up_skill:1:0", domain: "math", reason: "current" },
    ];
    const itemMeta: Record<string, ResolverItemMeta> = {
      "math:made_up_skill:1:0": {
        skillTag: "made_up_skill",
        domain: "math",
        difficulty: 3,
      },
    };
    const r = resolveSessionItems({ picks, itemMeta, sessionSeed: SEED });
    expect(r.unresolvedPicks).toHaveLength(1);
    expect(r.problems).toHaveLength(0);
  });

  it("preserves order across mixed math + spelling picks", () => {
    const picks: SelectedItem[] = [
      { itemId: "math:add_within_10:42:0", domain: "math", reason: "current" },
      { itemId: "spell:cvc_short_a:cat:audio", domain: "spelling", reason: "review" },
      { itemId: "math:sub_within_10:42:0", domain: "math", reason: "current" },
    ];
    const itemMeta: Record<string, ResolverItemMeta> = {
      "math:add_within_10:42:0": {
        skillTag: "add_within_10",
        domain: "math",
        difficulty: 1,
      },
      "spell:cvc_short_a:cat:audio": {
        skillTag: "cvc_short_a",
        domain: "spelling",
        difficulty: 1,
        prompt: "cat",
        expected: "cat",
        hintLadder: ["c"],
      },
      "math:sub_within_10:42:0": {
        skillTag: "sub_within_10",
        domain: "math",
        difficulty: 1,
      },
    };

    const r = resolveSessionItems({ picks, itemMeta, sessionSeed: SEED });
    expect(r.problems).toHaveLength(3);
    expect(r.problems[0].skillTag).toBe("add_within_10");
    expect(r.problems[1].skillTag).toBe("cvc_short_a");
    expect(r.problems[2].skillTag).toBe("sub_within_10");
    expect(r.source).toEqual({ procedural: 2, inventory: 1 });
  });
});
