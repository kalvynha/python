import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { generateFeedback } from "@/lib/claude/feedbackGenerator";
import { MODEL_SMART } from "@/lib/claude/client";

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

    const fb = await generateFeedback({
      kid: { displayName: kid.displayName ?? "friend", age: kid.age ?? 7 },
      attempts,
    });

    await sessionRef.set(
      { endedAt: Date.now(), summaryState: "ready" },
      { merge: true }
    );
    await sessionRef.collection("feedback").doc("summary").set({
      kidSummary: fb.kidSummary,
      parentSummary: fb.parentSummary,
      focusSkills: fb.focusSkills,
      model: MODEL_SMART,
      tokenUsage: fb.usage,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      kidSummary: fb.kidSummary,
      parentSummary: fb.parentSummary,
      focusSkills: fb.focusSkills,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const status = msg.includes("bearer") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
