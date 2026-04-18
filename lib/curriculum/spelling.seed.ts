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
 * Per-word sentences for spelling_audio items ("use in a sentence"), so
 * each word lands in a context that actually makes sense. Kept short
 * and kid-friendly (~6-year-old reading level).
 */
export const SPELLING_SENTENCES: Record<string, string> = {
  // cvc_short_a
  cat: "The cat sat on my lap.",
  bag: "My bag is full of books.",
  map: "We looked at the map.",
  hat: "He put on a warm hat.",
  tap: "Turn off the tap.",
  ran: "The dog ran home fast.",
  sad: "She felt sad today.",
  fan: "The fan is loud.",
  pan: "Mom flipped the pan.",
  jam: "I like jam on toast.",
  // cvc_short_e
  bed: "Time to go to bed.",
  net: "The fish jumped in the net.",
  pen: "Can I borrow your pen?",
  ten: "I can count to ten.",
  leg: "He hurt his leg.",
  red: "She wore a red dress.",
  pet: "My pet is a cat.",
  egg: "I ate one egg.",
  hen: "The hen laid an egg.",
  web: "A spider spun a web.",
  // cvc_short_i
  sit: "Please sit down.",
  pig: "The pig is pink.",
  big: "That's a big truck!",
  pin: "Don't touch the pin.",
  lid: "Put the lid on the jar.",
  hit: "He hit the ball hard.",
  dig: "Let's dig in the sand.",
  rip: "Try not to rip the paper.",
  tin: "I found a tin of beans.",
  win: "I hope we win the game!",
  // cvc_short_o
  dog: "My dog likes to play.",
  pot: "The pot is hot.",
  hop: "Frogs can hop far.",
  log: "A log fell off the pile.",
  mop: "She used a mop to clean.",
  fox: "The fox ran into the woods.",
  box: "What's inside the box?",
  top: "The toy is on top.",
  hot: "The soup is too hot.",
  job: "Dad has a new job.",
  // cvc_short_u
  cup: "My cup is full of milk.",
  bug: "A bug flew past me.",
  run: "I like to run fast.",
  sun: "The sun is bright today.",
  fun: "We had so much fun!",
  nut: "A squirrel ate the nut.",
  hut: "We built a hut of sticks.",
  mud: "My boots are full of mud.",
  bun: "I had a bun for lunch.",
  tub: "The baby splashed in the tub.",
  // digraphs sh/ch/th
  ship: "A big ship sailed past.",
  shop: "We went to the toy shop.",
  chip: "I ate one chip.",
  chin: "She has a dimple on her chin.",
  thin: "The ice is too thin to walk on.",
  that: "That is my favorite book.",
  dish: "Please put your dish in the sink.",
  fish: "The fish is swimming.",
  rich: "A king is rich.",
  with: "I played with my friend.",
  // long_a CVCe
  cake: "We ate a chocolate cake.",
  name: "What is your name?",
  lake: "The lake was cold.",
  gate: "She opened the gate.",
  made: "I made a card for you.",
  game: "Let's play a game!",
  face: "Her face lit up.",
  take: "Take one more cookie.",
  wave: "I saw a big wave.",
  plate: "My plate is empty.",
  // long_i CVCe
  bike: "I can ride my bike.",
  ride: "Let's go for a ride.",
  time: "What time is it?",
  kite: "His kite is in the tree.",
  mine: "That toy is mine.",
  hide: "Let's hide under the bed.",
  fine: "I feel fine today.",
  side: "Sit on this side.",
  bite: "Take a small bite.",
  smile: "Your smile makes me happy.",
  // long_o CVCe
  rope: "She pulled on the rope.",
  home: "I walked home.",
  note: "I wrote you a note.",
  hope: "I hope you have fun.",
  bone: "The dog chewed a bone.",
  stone: "He kicked a stone.",
  hole: "A hole in my sock!",
  joke: "Tell me a funny joke.",
  rode: "We rode our bikes to school.",
  woke: "I woke up early.",
  // r-controlled ar/or
  car: "Dad drives a blue car.",
  star: "A bright star is in the sky.",
  farm: "My aunt lives on a farm.",
  park: "Let's go to the park.",
  for: "This is for you.",
  corn: "I ate corn on the cob.",
  storm: "A big storm is coming.",
  short: "He wore short pants.",
  fork: "Eat with a fork, please.",
  horn: "The car horn is loud.",
  // vowel teams ee/ea
  tree: "A bird sat in the tree.",
  bead: "She made a bead necklace.",
  read: "I love to read at night.",
  seed: "Plant the seed in the dirt.",
  meet: "Let's meet at the door.",
  team: "Our team won the game.",
  seat: "This is my seat.",
  beach: "We built a castle on the beach.",
  sleep: "Time to sleep.",
  dream: "I had a silly dream.",
  // ie vs ei
  believe: "I believe you can do it.",
  receive: "Did you receive the letter?",
  field: "We played in the field.",
  piece: "Have a piece of apple.",
  ceiling: "A spider is on the ceiling.",
  friend: "She is my best friend.",
  niece: "My niece is four years old.",
  neighbor: "Our neighbor waved hi.",
  thief: "The thief got caught.",
  weight: "Check the weight of the bag.",
  // silent letters
  knee: "I scraped my knee.",
  knock: "Knock before you come in.",
  lamb: "The lamb is soft.",
  write: "Please write your name.",
  wrist: "My wrist hurts a little.",
  climb: "They climb the tall tree.",
  thumb: "He hurt his thumb.",
  know: "I know the answer!",
  knight: "The knight had a shiny sword.",
  ghost: "The ghost went whoo.",
  // common sight words
  because: "I laughed because it was funny.",
  said: "She said hello to me.",
  could: "Could you help me?",
  would: "I would like some milk.",
  every: "Every day is a new start.",
  school: "We walk to school together.",
  people: "A lot of people were there.",
  their: "They put on their coats.",
  through: "We walked through the park.",
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
      sentence: SPELLING_SENTENCES[word] ?? `Can you spell ${word}?`,
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
