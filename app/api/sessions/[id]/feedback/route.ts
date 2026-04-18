import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { generateFeedback } from "@/lib/claude/feedbackGenerator";
import { MODEL_SMART } from "@/lib/claude/client";
import {
  bucketBySkill,
  clampLevel,
  computeStars,
  computeStreak,
  proposeLevelDelta,
} from "@/lib/srs/levelUpdate";
import {
  badgeDocId,
  tiersToAward,
  type BadgeTier,
} from "@/lib/srs/badges";

export const runtime = "nodejs";

const Body = z.object({ kidId: z.string() });

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(req);
    const { id: sessionId } = await ctx.params;
    const body = Body.parse(await req.json());
    const db = adminDb();

    const householdSnap = await db
      .collection("households")
      .where("parentUid", "==", user.uid)
      .limit(1)
      .get();
    if (householdSnap.empty) {
      return NextResponse.json({ error: "no_household" }, { status: 404 });
    }
    const kidRef = householdSnap.docs[0].ref.collection("kids").doc(body.kidId);
    const kidDoc = await kidRef.get();
    if (!kidDoc.exists) {
      return NextResponse.json({ error: "kid_not_found" }, { status: 404 });
    }
    const kid = kidDoc.data()!;

    const sessionRef = kidRef.collection("sessions").doc(sessionId);
    const attemptsSnap = await sessionRef.collection("attempts").get();
    const attempts = attemptsSnap.docs.map((d) => {
      const a = d.data();
      return {
        skillTag: a.skillTag,
        prompt: a.prompt,
        expected: a.expected,
        given: a.given,
        correct: a.correct,
        timeMs: a.timeMs,
        hintUsed: a.hintUsed,
      };
    });

    if (attempts.length === 0) {
      return NextResponse.json({ error: "no_attempts" }, { status: 400 });
    }

    // "Correct" = unique items where the kid ever answered correctly
    // (any attempt). "Total" = unique items they saw. This matches how
    // the runner presents the experience: one item per question slot,
    // up to two tries each.
    const uniqueItems = new Set<string>();
    const correctItems = new Set<string>();
    for (const a of attemptsSnap.docs) {
      const d = a.data();
      if (typeof d.itemId === "string") uniqueItems.add(d.itemId);
      if (d.correct && typeof d.itemId === "string") correctItems.add(d.itemId);
    }
    const questionCount = uniqueItems.size;
    const correctCount = correctItems.size;

    const fb = await generateFeedback({
      kid: { displayName: kid.displayName ?? "friend", age: kid.age ?? 7 },
      attempts,
    });

    // ------------------------------------------------------------------
    // Motivation + level rollups
    // ------------------------------------------------------------------
    const now = Date.now();
    const stars = computeStars(attempts);
    const streak = computeStreak(
      kid.currentStreak ?? 0,
      kid.lastSessionDay as string | undefined,
      now
    );

    // Update skill levels for skills with enough evidence this session.
    // Any skill whose new level crosses a badge threshold earns one
    // (or more) badge docs — only if that tier isn't already earned.
    const buckets = bucketBySkill(attempts);
    const levelsRef = kidRef.collection("skillLevels");
    const badgesRef = kidRef.collection("badges");
    const levelWrites: Array<Promise<unknown>> = [];
    const earnedBadges: Array<{ skillTag: string; tier: BadgeTier; level: number }> = [];
    for (const [tag, bucket] of Object.entries(buckets)) {
      const delta = proposeLevelDelta(bucket);
      if (delta === 0) continue;
      const prev = await levelsRef.doc(tag).get();
      const prevLevel = prev.exists ? (prev.data()!.level as number) ?? 2 : 2;
      const nextLevel = clampLevel(prevLevel + delta);
      if (nextLevel === prevLevel) continue;
      levelWrites.push(
        levelsRef.doc(tag).set(
          { level: nextLevel, lastAssessedAt: now },
          { merge: true }
        )
      );

      // Check badge thresholds. Read existing badge docs for this
      // skill to know which tiers were already earned.
      const existingBadgesSnap = await badgesRef
        .where("skillTag", "==", tag)
        .get();
      const already = new Set<BadgeTier>(
        existingBadgesSnap.docs.map((d) => d.data().tier as BadgeTier)
      );
      const newTiers = tiersToAward(nextLevel, already);
      for (const tier of newTiers) {
        const bid = badgeDocId(tag, tier);
        levelWrites.push(
          badgesRef.doc(bid).set({
            id: bid,
            type: "skill_level",
            skillTag: tag,
            tier,
            level: nextLevel,
            earnedAt: now,
          })
        );
        earnedBadges.push({ skillTag: tag, tier, level: nextLevel });
      }
    }
    await Promise.all(levelWrites);

    await sessionRef.set(
      {
        endedAt: now,
        summaryState: "ready",
        stars,
        correctCount,
        questionCount,
      },
      { merge: true }
    );
    await sessionRef.collection("feedback").doc("summary").set({
      parentSummary: fb.parentSummary,
      focusSkills: fb.focusSkills,
      model: MODEL_SMART,
      tokenUsage: fb.usage,
      createdAt: now,
    });

    await kidRef.set(
      {
        currentStreak: streak.streak,
        lastSessionDay: streak.lastSessionDay,
        totalStars: FieldValue.increment(stars),
      },
      { merge: true }
    );

    return NextResponse.json({
      parentSummary: fb.parentSummary,
      focusSkills: fb.focusSkills,
      stars,
      streak: streak.streak,
      correctCount,
      questionCount,
      earnedBadges,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const status = msg.includes("bearer") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
