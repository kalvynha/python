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
  SPELLING_SKILLS,
} from "../curriculum/spelling.seed";
import type {
  MathSkillTag,
  SpellingSkillTag,
} from "../curriculum/types";
import type { ResolverItemMeta } from "./resolver";

/** Number of items to synthesize per skill, per seed. */
const ITEMS_PER_SKILL = 12;

/** Fixed seed so repeated calls build the same IDs — the selector
 * needs stable IDs to sync with the kid's reviewQueue. */
const SYNTH_SEED = 42;

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
      count: ITEMS_PER_SKILL,
      seed: SYNTH_SEED,
    });
    for (const it of items) {
      selectorMeta[it.id] = { difficulty: it.difficulty, domain: "math" };
      resolverMeta[it.id] = {
        skillTag: it.skillTag,
        domain: "math",
        difficulty: it.difficulty,
        // Math items are regenerated per-session by the resolver
        // with a fresh seed for variety, so we don't cache the
        // prompt/expected here.
      };
    }
  }

  for (const skill of SPELLING_SKILLS) {
    const items = generateSpellingItems(skill.tag as SpellingSkillTag, {
      count: ITEMS_PER_SKILL,
      seed: SYNTH_SEED,
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
