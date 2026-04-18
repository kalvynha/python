/**
 * Turn the SRS selector's picks into concrete problems without calling
 * Claude (in the common case).
 *
 * Tiers:
 *   1. Math picks -> generateMathItems() produces a fresh procedural
 *      item, seeded per-session for variety.
 *   2. Spelling picks -> read the pre-seeded item from Firestore when
 *      available; otherwise fall back to generateSpellingItems() from
 *      the curated word bank.
 *
 * Picks the resolver can't handle (missing skill tag, no word bank for
 * the domain, etc.) are returned as `unresolvedPicks` so the caller
 * can decide whether to invoke Claude for the gap.
 */
import type { SelectedItem } from "./selector";
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

const MATH_TAGS: ReadonlySet<string> = new Set(MATH_SKILLS.map((s) => s.tag));
const SPELLING_TAGS: ReadonlySet<string> = new Set(
  SPELLING_SKILLS.map((s) => s.tag)
);

export interface ResolverItemMeta {
  skillTag: string;
  domain: "math" | "spelling";
  difficulty: number;
  /** Present when the item is already seeded in Firestore. */
  prompt?: string;
  expected?: string;
  sentence?: string;
  hintLadder?: string[];
  type?: "math_arith" | "spelling_audio";
}

export interface ResolvedProblem {
  id: string;
  type: "math_arith" | "spelling_audio";
  skillTag: string;
  prompt: string;
  expected: string;
  sentence?: string;
  hintLadder: string[];
}

export interface ResolverInput {
  picks: SelectedItem[];
  itemMeta: Record<string, ResolverItemMeta>;
  /** Base seed used for per-problem procedural generation. */
  sessionSeed: number;
}

export interface ResolverResult {
  problems: ResolvedProblem[];
  unresolvedPicks: SelectedItem[];
  source: {
    procedural: number;
    inventory: number;
  };
}

export function resolveSessionItems(input: ResolverInput): ResolverResult {
  const problems: ResolvedProblem[] = [];
  const unresolvedPicks: SelectedItem[] = [];
  let procedural = 0;
  let inventory = 0;

  for (let i = 0; i < input.picks.length; i++) {
    const pick = input.picks[i];
    const meta = input.itemMeta[pick.itemId];
    const tag = meta?.skillTag;
    if (!tag) {
      unresolvedPicks.push(pick);
      continue;
    }

    const seed = input.sessionSeed + i * 7919; // 7919 = arbitrary prime

    if (pick.domain === "math") {
      if (!MATH_TAGS.has(tag)) {
        unresolvedPicks.push(pick);
        continue;
      }
      const [it] = generateMathItems(tag as MathSkillTag, {
        count: 1,
        seed,
      });
      problems.push({
        id: it.id,
        type: "math_arith",
        skillTag: it.skillTag,
        prompt: it.prompt,
        expected: it.expected,
        hintLadder: it.hintLadder,
      });
      procedural += 1;
      continue;
    }

    // Spelling branch
    if (pick.domain === "spelling") {
      // Prefer the seeded inventory item if the meta has the needed
      // fields. This gives us the same wording the parent saw in seed.
      if (meta.prompt && meta.expected && meta.hintLadder) {
        problems.push({
          id: pick.itemId,
          type: "spelling_audio",
          skillTag: tag,
          prompt: meta.prompt,
          expected: meta.expected,
          sentence: meta.sentence,
          hintLadder: meta.hintLadder,
        });
        inventory += 1;
        continue;
      }
      if (!SPELLING_TAGS.has(tag)) {
        unresolvedPicks.push(pick);
        continue;
      }
      const [it] = generateSpellingItems(tag as SpellingSkillTag, {
        count: 1,
        seed,
      });
      problems.push({
        id: `spell:${it.skillTag}:${it.word}:audio`,
        type: "spelling_audio",
        skillTag: it.skillTag,
        prompt: it.word,
        expected: it.word,
        sentence: it.sentence,
        hintLadder: it.hintLadder,
      });
      procedural += 1;
      continue;
    }

    unresolvedPicks.push(pick);
  }

  return {
    problems,
    unresolvedPicks,
    source: { procedural, inventory },
  };
}
