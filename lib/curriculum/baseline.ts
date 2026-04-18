/**
 * Build a short baseline assessment for a newly-added kid.
 *
 * 10 questions total: 5 math + 5 spelling, one per difficulty level 1-5
 * in each domain. Results drive the starting skillLevels row per skill
 * domain grouping; we record the highest difficulty at which the kid
 * got the item correct, defaulting to 1.
 */
import { generateMathItems, MATH_SKILLS } from "./math.seed";
import {
  generateSpellingItems,
  SPELLING_SKILLS,
} from "./spelling.seed";
import type { MathSkillTag, SpellingSkillTag } from "./types";

export interface BaselineQuestion {
  id: string;
  type: "math_arith" | "spelling_audio";
  skillTag: string;
  difficulty: number;
  prompt: string;
  expected: string;
  sentence?: string;
}

function pickSkillByDifficulty<T extends { tag: string; difficulty: number }>(
  skills: T[],
  d: number
): T {
  const eligible = skills.filter((s) => s.difficulty === d);
  const pool = eligible.length ? eligible : skills; // fallback
  // Stable-ish pick — same difficulty always returns same skill.
  return pool[0];
}

export function buildBaseline(seed = 17): BaselineQuestion[] {
  const out: BaselineQuestion[] = [];
  for (let d = 1; d <= 5; d++) {
    const mathSkill = pickSkillByDifficulty(MATH_SKILLS, d);
    const mi = generateMathItems(mathSkill.tag as MathSkillTag, {
      count: 1,
      seed: seed + d,
    })[0];
    out.push({
      id: mi.id,
      type: "math_arith",
      skillTag: mi.skillTag,
      difficulty: d,
      prompt: mi.prompt,
      expected: mi.expected,
    });

    const spellSkill = pickSkillByDifficulty(SPELLING_SKILLS, d);
    const si = generateSpellingItems(spellSkill.tag as SpellingSkillTag, {
      count: 1,
      seed: seed + d,
    })[0];
    out.push({
      id: `${si.id}:audio`,
      type: "spelling_audio",
      skillTag: si.skillTag,
      difficulty: d,
      prompt: si.word,
      expected: si.word,
      sentence: si.sentence,
    });
  }
  return out;
}

/**
 * Compute starting math/spelling levels from baseline results.
 * Level = highest difficulty where the kid was correct, default 1.
 */
export function scoreBaseline(
  questions: BaselineQuestion[],
  answers: Record<string, boolean>
): { math: number; spelling: number } {
  let mathLevel = 1;
  let spellLevel = 1;
  for (const q of questions) {
    if (!answers[q.id]) continue;
    if (q.type === "math_arith" && q.difficulty > mathLevel) {
      mathLevel = q.difficulty;
    }
    if (q.type === "spelling_audio" && q.difficulty > spellLevel) {
      spellLevel = q.difficulty;
    }
  }
  return { math: mathLevel, spelling: spellLevel };
}
