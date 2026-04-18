import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { applyAttempt, initReview } from "@/lib/srs/leitner";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const Body = z.object({
  kidId: z.string(),
  itemId: z.string(),
  skillTag: z.string(),
  prompt: z.string(),
  expected: z.string(),
  given: z.string(),
  correct: z.boolean(),
  timeMs: z.number().int().nonnegative(),
  hintUsed: z.boolean(),
});

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
    const sessionRef = kidRef.collection("sessions").doc(sessionId);

    // Log the attempt
    const attemptId = randomUUID();
    const now = Date.now();
    await sessionRef.collection("attempts").doc(attemptId).set({
      id: attemptId,
      itemId: body.itemId,
      skillTag: body.skillTag,
      prompt: body.prompt,
      expected: body.expected,
      given: body.given,
      correct: body.correct,
      timeMs: body.timeMs,
      hintUsed: body.hintUsed,
      at: now,
    });

    // Update Leitner state
    const queueRef = kidRef.collection("reviewQueue").doc(body.itemId);
    const queueSnap = await queueRef.get();
    const prev = queueSnap.exists
      ? {
          itemId: body.itemId,
          box: queueSnap.data()!.box ?? 1,
          dueAt: queueSnap.data()!.dueAt ?? 0,
          streak: queueSnap.data()!.streak ?? 0,
        }
      : initReview(body.itemId, now);
    const next = applyAttempt(prev, body.correct, now);
    await queueRef.set(next, { merge: true });

    return NextResponse.json({ ok: true, review: next });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const status = msg.includes("bearer") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
