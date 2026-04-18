import type { SkillDef, MathSkillTag } from "./types";

export const MATH_SKILLS: SkillDef[] = [
  { tag: "add_within_10", domain: "math", name: "Add within 10", difficulty: 1, description: "Single-digit addition totaling ≤ 10." },
  { tag: "sub_within_10", domain: "math", name: "Subtract within 10", difficulty: 1, description: "Single-digit subtraction with minuend ≤ 10." },
  { tag: "add_within_20", domain: "math", name: "Add within 20", difficulty: 2, description: "Sums up to 20, may cross 10." },
  { tag: "sub_within_20", domain: "math", name: "Subtract within 20", difficulty: 2, description: "Differences with minuend up to 20." },
  { tag: "add_2digit_no_regroup", domain: "math", name: "2-digit addition (no regroup)", difficulty: 3, description: "Two 2-digit numbers, no carry." },
  { tag: "add_2digit_regroup", domain: "math", name: "2-digit addition with regrouping", difficulty: 4, description: "Two 2-digit numbers, carry required." },
  { tag: "sub_2digit_regroup", domain: "math", name: "2-digit subtraction with regrouping", difficulty: 5, description: "Borrowing across tens." },
  { tag: "mul_by_2_5_10", domain: "math", name: "Multiply by 2, 5, 10", difficulty: 4, description: "Skip-counting multiplications." },
  { tag: "mul_facts_0_5", domain: "math", name: "Multiplication facts 0–5", difficulty: 5, description: "Products up to 5×12." },
  { tag: "mul_facts_6_9", domain: "math", name: "Multiplication facts 6–9", difficulty: 6, description: "The harder half of the times table." },
  { tag: "div_facts_basic", domain: "math", name: "Basic division facts", difficulty: 6, description: "Inverse of multiplication facts." },
  { tag: "fractions_halves_quarters", domain: "math", name: "Halves and quarters", difficulty: 5, description: "Identify and compare simple fractions." },
];

interface GenOpts {
  count: number;
  seed?: number;
}

/**
 * Seedable PRNG so item generation is deterministic for tests + SRS
 * stability (same skill + same seed → same items).
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rnd: () => number, min: number, max: number) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}

interface MathItem {
  id: string;
  skillTag: MathSkillTag;
  prompt: string; // "12 + 7"
  expected: string; // "19"
  difficulty: number;
  hintLadder: string[];
}

export function generateMathItems(tag: MathSkillTag, opts: GenOpts): MathItem[] {
  const rnd = mulberry32(opts.seed ?? 1);
  const items: MathItem[] = [];
  for (let i = 0; i < opts.count; i++) {
    let prompt = "";
    let expected = 0;
    let hints: string[] = [];
    switch (tag) {
      case "add_within_10": {
        const a = randInt(rnd, 0, 10), b = randInt(rnd, 0, 10 - a);
        prompt = `${a} + ${b}`; expected = a + b;
        hints = [`Start at ${a} and count up ${b}.`, `${a} and ${b} together make ${a + b}.`];
        break;
      }
      case "sub_within_10": {
        const a = randInt(rnd, 1, 10), b = randInt(rnd, 0, a);
        prompt = `${a} − ${b}`; expected = a - b;
        hints = [`Start at ${a} and count back ${b}.`, `Think: what plus ${b} makes ${a}?`];
        break;
      }
      case "add_within_20": {
        const a = randInt(rnd, 2, 19), b = randInt(rnd, 1, 20 - a);
        prompt = `${a} + ${b}`; expected = a + b;
        hints = [`Make 10 first: ${a} + ? = 10.`, `Then add what's left.`];
        break;
      }
      case "sub_within_20": {
        const a = randInt(rnd, 5, 20), b = randInt(rnd, 0, a);
        prompt = `${a} − ${b}`; expected = a - b;
        hints = [`Count back from ${a}.`, `Or think addition: ${b} + ? = ${a}.`];
        break;
      }
      case "add_2digit_no_regroup": {
        const tensA = randInt(rnd, 1, 4), tensB = randInt(rnd, 1, 4);
        const onesA = randInt(rnd, 0, 4), onesB = randInt(rnd, 0, 4);
        const a = tensA * 10 + onesA, b = tensB * 10 + onesB;
        prompt = `${a} + ${b}`; expected = a + b;
        hints = ["Add the ones first.", "Then add the tens."];
        break;
      }
      case "add_2digit_regroup": {
        const onesA = randInt(rnd, 5, 9), onesB = randInt(rnd, 5, 9);
        const tensA = randInt(rnd, 1, 4), tensB = randInt(rnd, 1, 4);
        const a = tensA * 10 + onesA, b = tensB * 10 + onesB;
        prompt = `${a} + ${b}`; expected = a + b;
        hints = [
          `Ones column: ${onesA} + ${onesB} = ${onesA + onesB}. Carry the 1.`,
          "Add the tens plus the carry.",
        ];
        break;
      }
      case "sub_2digit_regroup": {
        const onesA = randInt(rnd, 0, 4), onesB = randInt(rnd, 5, 9);
        const tensA = randInt(rnd, 3, 7), tensB = randInt(rnd, 1, tensA - 1);
        const a = tensA * 10 + onesA, b = tensB * 10 + onesB;
        prompt = `${a} − ${b}`; expected = a - b;
        hints = [
          `Ones are too small — borrow 1 from the tens.`,
          `Now ones are ${onesA + 10}. Subtract ${onesB}.`,
        ];
        break;
      }
      case "mul_by_2_5_10": {
        const factor = [2, 5, 10][randInt(rnd, 0, 2)];
        const other = randInt(rnd, 1, 10);
        prompt = `${factor} × ${other}`; expected = factor * other;
        hints = [`Skip-count by ${factor}, ${other} times.`];
        break;
      }
      case "mul_facts_0_5": {
        const a = randInt(rnd, 0, 5), b = randInt(rnd, 0, 12);
        prompt = `${a} × ${b}`; expected = a * b;
        hints = ["Think of groups.", `${a} groups of ${b}.`];
        break;
      }
      case "mul_facts_6_9": {
        const a = randInt(rnd, 6, 9), b = randInt(rnd, 2, 9);
        prompt = `${a} × ${b}`; expected = a * b;
        hints = [`Try: ${a} × ${b} = ${a} × ${b - 1} + ${a}.`];
        break;
      }
      case "div_facts_basic": {
        const b = randInt(rnd, 2, 9), q = randInt(rnd, 1, 9);
        prompt = `${b * q} ÷ ${b}`; expected = q;
        hints = [`${b} times what equals ${b * q}?`];
        break;
      }
      case "fractions_halves_quarters": {
        // Represent as "1/2 of 8" style for younger kids.
        const whole = [4, 6, 8, 10, 12][randInt(rnd, 0, 4)];
        const denom = [2, 4][randInt(rnd, 0, 1)];
        prompt = `1/${denom} of ${whole}`;
        expected = whole / denom;
        hints = [`Split ${whole} into ${denom} equal groups.`, `How many in one group?`];
        break;
      }
    }
    items.push({
      id: `math:${tag}:${opts.seed ?? 1}:${i}`,
      skillTag: tag,
      prompt,
      expected: String(expected),
      difficulty: MATH_SKILLS.find((s) => s.tag === tag)!.difficulty,
      hintLadder: hints,
    });
  }
  return items;
}
