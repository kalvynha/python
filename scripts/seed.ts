/**
 * Seed the `items` collection in Firestore with curated math and
 * spelling items. Run with: `pnpm seed` (or `npm run seed`).
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_B64 in the environment.
 */
import { adminDb } from "../lib/firebase/admin";
import { generateMathItems, MATH_SKILLS } from "../lib/curriculum/math.seed";
import {
  generateSpellingItems,
  SPELLING_SKILLS,
} from "../lib/curriculum/spelling.seed";
import type { MathSkillTag, SpellingSkillTag } from "../lib/curriculum/types";

async function main() {
  const db = adminDb();
  const batch = db.batch();
  let count = 0;

  for (const skill of MATH_SKILLS) {
    const items = generateMathItems(skill.tag as MathSkillTag, {
      count: 20,
      seed: 42,
    });
    for (const it of items) {
      batch.set(db.collection("items").doc(it.id), {
        ...it,
        type: "math_arith",
      });
      count++;
    }
  }

  for (const skill of SPELLING_SKILLS) {
    const items = generateSpellingItems(skill.tag as SpellingSkillTag, {
      count: 10,
      seed: 42,
    });
    for (const it of items) {
      batch.set(db.collection("items").doc(`${it.id}:audio`), {
        id: `${it.id}:audio`,
        type: "spelling_audio",
        skillTag: it.skillTag,
        difficulty: it.difficulty,
        prompt: it.word,
        expected: it.word,
        sentence: it.sentence,
        hintLadder: it.hintLadder,
      });
      count += 1;
    }
  }

  await batch.commit();
  console.log(`Seeded ${count} items.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
