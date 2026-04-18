import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { buildBaseline, scoreBaseline } from "@/lib/curriculum/baseline";
import { MATH_SKILLS } from "@/lib/curriculum/math.seed";
import { SPELLING_SKILLS } from "@/lib/curriculum/spelling.seed";

export const runtime = "nodejs";

const Body = z.object({
  kidId: z.string(),
  answers: z.record(z.string(), z.boolean()),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
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
    const kidRef = householdSnap.docs[0].ref
      .collection("kids")
      .doc(body.kidId);
    const kidDoc = await kidRef.get();
    if (!kidDoc.exists) {
      return NextResponse.json({ error: "kid_not_found" }, { status: 404 });
    }

    const questions = buildBaseline();
    const { math, spelling } = scoreBaseline(questions, body.answers);
    const now = Date.now();

    // Seed a per-domain level on every skill tag so the selector has
    // something to work with. Specific skills adapt later based on
    // real session performance via the feedback rollup.
    const levelsRef = kidRef.collection("skillLevels");
    const writes: Array<Promise<unknown>> = [];
    for (const s of MATH_SKILLS) {
      writes.push(
        levelsRef.doc(s.tag).set(
          { level: math, lastAssessedAt: now },
          { merge: true }
        )
      );
    }
    for (const s of SPELLING_SKILLS) {
      writes.push(
        levelsRef.doc(s.tag).set(
          { level: spelling, lastAssessedAt: now },
          { merge: true }
        )
      );
    }
    await Promise.all(writes);

    await kidRef.set(
      { baselined: true, baselinedAt: now },
      { merge: true }
    );

    return NextResponse.json({ math, spelling });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const status = msg.includes("bearer") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
