import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { generateSession } from "@/lib/claude/sessionGenerator";
import { pickSessionItems } from "@/lib/srs/selector";
import {
  resolveSessionItems,
  type ResolvedProblem,
} from "@/lib/srs/resolver";
import { buildInventory } from "@/lib/srs/inventory";
import type { ReviewState } from "@/lib/srs/leitner";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const Body = z.object({
  kidId: z.string(),
  durationS: z.number().int().min(120).max(1800),
});

// Below this many resolved problems, fall back to Claude for the gap.
const FALLBACK_THRESHOLD = 6;

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

    const levels = { math: 2, spelling: 2 };
    const weakSkillTags: string[] = [];
    levelsSnap.docs.forEach((d) => {
      const lvl = d.data().level ?? 2;
      const tag = d.id;
      if (
        tag.startsWith("add") ||
        tag.startsWith("sub") ||
        tag.startsWith("mul") ||
        tag.startsWith("div") ||
        tag.startsWith("fractions")
      ) {
        levels.math = Math.max(levels.math, lvl);
      } else {
        levels.spelling = Math.max(levels.spelling, lvl);
      }
      if (lvl <= 1) weakSkillTags.push(tag);
    });

    // Synthesize the inventory from curriculum seeds — no Firestore
    // read, and every request has a full pool to pick from.
    const { selectorMeta, resolverMeta } = buildInventory();

    const picks = pickSessionItems({
      reviewQueue,
      itemMeta: selectorMeta,
      currentLevel: levels,
      subjectMix: kid.subjectMix ?? { math: 0.5, spelling: 0.5 },
      durationS: body.durationS,
      interleave: kid.interleave ?? true,
      now: Date.now(),
    });

    const sessionId = randomUUID();
    const sessionSeed =
      Date.now() ^ (sessionId.charCodeAt(0) + sessionId.charCodeAt(9));

    const resolved = resolveSessionItems({
      picks,
      itemMeta: resolverMeta,
      sessionSeed,
    });

    let problems: ResolvedProblem[] = resolved.problems;
    let claudeCount = 0;
    let claudeUsage: {
      inputTokens: number;
      outputTokens: number;
      cacheReadInputTokens?: number;
    } | null = null;

    const needsFallback =
      problems.length < FALLBACK_THRESHOLD ||
      resolved.unresolvedPicks.length > 0;

    if (needsFallback) {
      const dueItems = picks
        .filter((p) => p.reason === "review")
        .map((p) => {
          const m = resolverMeta[p.itemId];
          return {
            itemId: p.itemId,
            skillTag: m?.skillTag ?? "",
            prompt: m?.prompt ?? "",
            expected: m?.expected ?? "",
          };
        })
        .filter((x) => x.skillTag && x.prompt);

      const claudeResult = await generateSession({
        kid: { age: kid.age ?? 7, displayName: kid.displayName ?? "friend" },
        levels,
        weakSkillTags,
        dueItems,
        subjectMix: kid.subjectMix ?? { math: 0.5, spelling: 0.5 },
        durationS: body.durationS,
        interleave: kid.interleave ?? true,
      });
      claudeUsage = claudeResult.usage;
      const extras: ResolvedProblem[] = claudeResult.problems.map((p) => ({
        id: p.id,
        type: p.type,
        skillTag: p.skillTag,
        prompt: p.prompt,
        expected: p.expected,
        sentence: p.sentence,
        hintLadder: p.hintLadder,
      }));
      const deficit = Math.max(FALLBACK_THRESHOLD - problems.length, 0);
      const need = Math.max(deficit, resolved.unresolvedPicks.length);
      const filler = extras.slice(0, need);
      problems = [...problems, ...filler];
      claudeCount = filler.length;
    }

    const generationSource = {
      ...resolved.source,
      claude: claudeCount,
    };

    await kidRef.collection("sessions").doc(sessionId).set({
      id: sessionId,
      kidId: body.kidId,
      startedAt: Date.now(),
      endedAt: null,
      durationTargetS: body.durationS,
      subjectMix: kid.subjectMix ?? { math: 0.5, spelling: 0.5 },
      itemIdsPlanned: problems.map((p) => p.id),
      summaryState: "pending",
      problems,
      generationSource,
      usage: claudeUsage,
    });

    return NextResponse.json({ sessionId, problems });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const status = msg.includes("bearer") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
