import type { SkillDef, SpellingSkillTag } from "./types";

export const SPELLING_SKILLS: SkillDef[] = [
  { tag: "cvc_short_a", domain: "spelling", name: "Short 'a' CVC", difficulty: 1, description: "cat, map, bag." },
  { tag: "cvc_short_e", domain: "spelling", name: "Short 'e' CVC", difficulty: 1, description: "bed, net, pen." },
  { tag: "cvc_short_i", domain: "spelling", name: "Short 'i' CVC", difficulty: 1, description: "sit, pig, big." },
  { tag: "cvc_short_o", domain: "spelling", name: "Short 'o' CVC", difficulty: 1, description: "dog, pot, hop." },
  { tag: "cvc_short_u", domain: "spelling", name: "Short 'u' CVC", difficulty: 1, description: "cup, bug, run." },
  { tag: "digraphs_sh_ch_th", domain: "spelling", name: "Digraphs sh/ch/th", difficulty: 2, description: "ship, chip, thin." },
  { tag: "long_a_cvce", domain: "spelling", name: "Long 'a' silent-e", difficulty: 3, description: "cake, name, lake." },
  { tag: "long_i_cvce", domain: "spelling", name: "Long 'i' silent-e", difficulty: 3, description: "bike, ride, time." },
  { tag: "long_o_cvce", domain: "spelling", name: "Long 'o' silent-e", difficulty: 3, description: "rope, home, note." },
  { tag: "r_controlled_ar_or", domain: "spelling", name: "R-controlled ar/or", difficulty: 4, description: "car, star, for, corn." },
  { tag: "vowel_teams_ee_ea", domain: "spelling", name: "Vowel teams ee/ea", difficulty: 4, description: "tree, bead, read." },
  { tag: "ie_vs_ei", domain: "spelling", name: "'ie' vs 'ei'", difficulty: 6, description: "believe, receive, field." },
  { tag: "silent_letters", domain: "spelling", name: "Silent letters", difficulty: 6, description: "knee, knock, lamb, write." },
  { tag: "common_sight_words", domain: "spelling", name: "High-frequency sight words", difficulty: 2, description: "because, friend, said." },
];

/**
 * Curated word banks. These are classic phonics-pattern and sight-word
 * sets (Dolch/Fry style) rather than AI-generated to keep content
 * predictable and age-appropriate.
 */
export const SPELLING_WORDS: Record<SpellingSkillTag, string[]> = {
  cvc_short_a: ["cat", "bag", "map", "hat", "tap", "ran", "sad", "fan", "pan", "jam"],
  cvc_short_e: ["bed", "net", "pen", "ten", "leg", "red", "pet", "egg", "hen", "web"],
  cvc_short_i: ["sit", "pig", "big", "pin", "lid", "hit", "dig", "rip", "tin", "win"],
  cvc_short_o: ["dog", "pot", "hop", "log", "mop", "fox", "box", "top", "hot", "job"],
  cvc_short_u: ["cup", "bug", "run", "sun", "fun", "nut", "hut", "mud", "bun", "tub"],
  digraphs_sh_ch_th: ["ship", "shop", "chip", "chin", "thin", "that", "dish", "fish", "rich", "with"],
  long_a_cvce: ["cake", "name", "lake", "gate", "made", "game", "face", "take", "wave", "plate"],
  long_i_cvce: ["bike", "ride", "time", "kite", "mine", "hide", "fine", "side", "bite", "smile"],
  long_o_cvce: ["rope", "home", "note", "hope", "bone", "stone", "hole", "joke", "rode", "woke"],
  r_controlled_ar_or: ["car", "star", "farm", "park", "for", "corn", "storm", "short", "fork", "horn"],
  vowel_teams_ee_ea: ["tree", "bead", "read", "seed", "meet", "team", "seat", "beach", "sleep", "dream"],
  ie_vs_ei: ["believe", "receive", "field", "piece", "ceiling", "friend", "niece", "neighbor", "thief", "weight"],
  silent_letters: ["knee", "knock", "lamb", "write", "wrist", "climb", "thumb", "know", "knight", "ghost"],
  common_sight_words: ["because", "friend", "said", "could", "would", "every", "school", "people", "their", "through"],
};

/**
 * Short sentence templates used by spelling_audio items ("use in a sentence")
 * so kids hear the word in context. Keep simple, ~6 yr old reading level.
 */
export const SENTENCE_TEMPLATES: Record<SpellingSkillTag, (w: string) => string> = {
  cvc_short_a: (w) => `The ${w} is on the mat.`,
  cvc_short_e: (w) => `I see the ${w}.`,
  cvc_short_i: (w) => `Look at the ${w}.`,
  cvc_short_o: (w) => `I found a ${w}.`,
  cvc_short_u: (w) => `Here is the ${w}.`,
  digraphs_sh_ch_th: (w) => `She saw the ${w}.`,
  long_a_cvce: (w) => `We played a fun ${w}.`,
  long_i_cvce: (w) => `I like to ${w}.`,
  long_o_cvce: (w) => `He went ${w}.`,
  r_controlled_ar_or: (w) => `Look at the ${w}!`,
  vowel_teams_ee_ea: (w) => `Can you see the ${w}?`,
  ie_vs_ei: (w) => `Please ${w} me.`,
  silent_letters: (w) => `Watch out for the ${w}.`,
  common_sight_words: (w) => `I like ${w} cake.`,
};

interface SpellingItem {
  id: string;
  skillTag: SpellingSkillTag;
  word: string;
  sentence: string;
  difficulty: number;
  hintLadder: string[];
}

/**
 * Build spelling items for a given skill. Deterministic given the seed.
 */
export function generateSpellingItems(
  tag: SpellingSkillTag,
  opts: { count: number; seed?: number }
): SpellingItem[] {
  const pool = SPELLING_WORDS[tag];
  const seed = opts.seed ?? 1;
  // Simple rotation by seed for determinism
  const start = seed % pool.length;
  const out: SpellingItem[] = [];
  const difficulty = SPELLING_SKILLS.find((s) => s.tag === tag)!.difficulty;
  for (let i = 0; i < opts.count; i++) {
    const word = pool[(start + i) % pool.length];
    out.push({
      id: `spell:${tag}:${word}`,
      skillTag: tag,
      word,
      sentence: SENTENCE_TEMPLATES[tag](word),
      difficulty,
      hintLadder: [
        `It starts with "${word[0]}".`,
        `It has ${word.length} letters.`,
        `Sound it out slowly.`,
      ],
    });
  }
  return out;
}
