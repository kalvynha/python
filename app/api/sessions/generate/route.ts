import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { generateSession } from "@/lib/claude/sessionGenerator";
import { pickSessionItems } from "@/lib/srs/selector";
import type { ReviewState } from "@/lib/srs/leitner";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const Body = z.object({
  kidId: z.string(),
  durationS: z.number().int().min(120).max(1800),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = Body.parse(await req.json());
    const db = adminDb();

    // Locate household owned by this user, with the named kid.
    const householdSnap = await db
      .collection("households")
      .where("parentUid", "==", user.uid)
      .limit(1)
      .get();
    if (householdSnap.empty) {
      return NextResponse.json({ error: "no_household" }, { status: 404 });
    }
    const householdRef = householdSnap.docs[0].ref;
    const kidRef = householdRef.collection("kids").doc(body.kidId);
    const kidDoc = await kidRef.get();
    if (!kidDoc.exists) {
      return NextResponse.json({ error: "kid_not_found" }, { status: 404 });
    }
    const kid = kidDoc.data()!;

    // Pull review queue + skill levels
    const [reviewSnap, levelsSnap] = await Promise.all([
      kidRef.collection("reviewQueue").get(),
      kidRef.collection("skillLevels").get(),
    ]);
    const reviewQueue: ReviewState[] = reviewSnap.docs.map((d) => ({
      itemId: d.id,
      box: d.data().box ?? 1,
      dueAt: d.data().dueAt ?? 0,
      streak: d.data().streak ?? 0,
    }));

    // Turn levels into a domain summary
    const levels = { math: 2, spelling: 2 };
    const weakSkillTags: string[] = [];
    levelsSnap.docs.forEach((d) => {
      const lvl = d.data().level ?? 2;
      const tag = d.id;
      if (tag.startsWith("add") || tag.startsWith("sub") || tag.startsWith("mul") || tag.startsWith("div") || tag.startsWith("fractions")) {
        levels.math = Math.max(levels.math, lvl);
      } else {
        levels.spelling = Math.max(levels.spelling, lvl);
      }
      if (lvl <= 1) weakSkillTags.push(tag);
    });

    // Load minimal item metadata for selector (from /items)
    const itemsSnap = await db.collection("items").get();
    const itemMeta: Record<string, { difficulty: number; domain: "math" | "spelling" }> = {};
    const itemById: Record<string, { skillTag: string; prompt: string; expected: string }> = {};
    itemsSnap.docs.forEach((d) => {
      const data = d.data();
      const domain: "math" | "spelling" = data.type === "math_arith" ? "math" : "spelling";
      itemMeta[d.id] = { difficulty: data.difficulty ?? 1, domain };
      itemById[d.id] = {
        skillTag: data.skillTag,
        prompt: data.prompt,
        expected: data.expected,
      };
    });

    const picked = pickSessionItems({
      reviewQueue,
      itemMeta,
      currentLevel: levels,
      subjectMix: kid.subjectMix ?? { math: 0.5, spelling: 0.5 },
      durationS: body.durationS,
      interleave: kid.interleave ?? true,
      now: Date.now(),
    });

    const dueItems = picked
      .filter((p) => p.reason === "review")
      .map((p) => ({ itemId: p.itemId, ...itemById[p.itemId] }));

    const result = await generateSession({
      kid: { age: kid.age ?? 7, displayName: kid.displayName ?? "friend" },
      levels,
      weakSkillTags,
      dueItems,
      subjectMix: kid.subjectMix ?? { math: 0.5, spelling: 0.5 },
      durationS: body.durationS,
      interleave: kid.interleave ?? true,
    });

    // Persist the session document + planned items.
    const sessionId = randomUUID();
    await kidRef.collection("sessions").doc(sessionId).set({
      id: sessionId,
      kidId: body.kidId,
      startedAt: Date.now(),
      endedAt: null,
      durationTargetS: body.durationS,
      subjectMix: kid.subjectMix ?? { math: 0.5, spelling: 0.5 },
      itemIdsPlanned: result.problems.map((p) => p.id),
      summaryState: "pending",
      problems: result.problems, // cache for the runner
      usage: result.usage,
    });

    return NextResponse.json({ sessionId, problems: result.problems });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const status = msg.includes("bearer") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
