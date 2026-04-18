/**
 * Synthesize the session-time inventory directly from the curriculum
 * seeds instead of reading Firestore. Removes the dependency on
 * `npm run seed` ever being run, and guarantees the selector has a
 * rich pool of items to pick from.
 */
import {
  generateMathItems,
  MATH_SKILLS,
} from "../curriculum/math.seed";
import {
  generateSpellingItems,
  SPELLING_WORDS,
} from "../curriculum/spelling.seed";
import type { MathSkillTag, SpellingSkillTag } from "../curriculum/types";
import type { ResolverItemMeta } from "./resolver";

/**
 * Math is procedurally regenerated per session (the resolver calls
 * generateMathItems with a per-session seed), so the inventory only
 * needs enough sample IDs to drive the selector's difficulty buckets.
 */
const MATH_SAMPLES_PER_SKILL = 12;
const MATH_SYNTH_SEED = 42;

export interface SynthesizedInventory {
  selectorMeta: Record<
    string,
    { difficulty: number; domain: "math" | "spelling" }
  >;
  resolverMeta: Record<string, ResolverItemMeta>;
}

export function buildInventory(): SynthesizedInventory {
  const selectorMeta: SynthesizedInventory["selectorMeta"] = {};
  const resolverMeta: SynthesizedInventory["resolverMeta"] = {};

  for (const skill of MATH_SKILLS) {
    const items = generateMathItems(skill.tag as MathSkillTag, {
      count: MATH_SAMPLES_PER_SKILL,
      seed: MATH_SYNTH_SEED,
    });
    for (const it of items) {
      selectorMeta[it.id] = { difficulty: it.difficulty, domain: "math" };
      resolverMeta[it.id] = {
        skillTag: it.skillTag,
        domain: "math",
        difficulty: it.difficulty,
      };
    }
  }

  // Spelling: seed EVERY curated word from SPELLING_WORDS. With this,
  // a kid at a given difficulty has their skill's full word bank
  // available rather than a 12-item slice. IDs are keyed by word so
  // the reviewQueue stays stable across builds.
  const tags = Object.keys(SPELLING_WORDS) as SpellingSkillTag[];
  for (const tag of tags) {
    const pool = SPELLING_WORDS[tag];
    if (!pool || pool.length === 0) continue;
    const items = generateSpellingItems(tag, {
      count: pool.length,
      seed: 0,
    });
    for (const it of items) {
      const id = `spell:${it.skillTag}:${it.word}:audio`;
      selectorMeta[id] = {
        difficulty: it.difficulty,
        domain: "spelling",
      };
      resolverMeta[id] = {
        skillTag: it.skillTag,
        domain: "spelling",
        difficulty: it.difficulty,
        prompt: it.word,
        expected: it.word,
        sentence: it.sentence,
        hintLadder: it.hintLadder,
        type: "spelling_audio",
      };
    }
  }

  return { selectorMeta, resolverMeta };
}
