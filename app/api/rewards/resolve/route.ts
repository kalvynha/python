import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * Parent approves or declines a pending redemption. Uses a Firestore
 * transaction so two tabs can't double-approve the same request.
 * Approval increments the kid's spentStars by the redemption's cost.
 * Decline just flips status; no star change.
 */

const Body = z.object({
  kidId: z.string(),
  redemptionId: z.string(),
  action: z.enum(["approve", "decline"]),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = Body.parse(await req.json());
    const db = adminDb();

    const hSnap = await db
      .collection("households")
      .where("parentUid", "==", user.uid)
      .limit(1)
      .get();
    if (hSnap.empty) {
      return NextResponse.json({ error: "no_household" }, { status: 404 });
    }
    const kidRef = hSnap.docs[0].ref.collection("kids").doc(body.kidId);
    const redemptionRef = kidRef
      .collection("redemptions")
      .doc(body.redemptionId);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(redemptionRef);
      if (!snap.exists) return { ok: false, error: "redemption_not_found" };
      const data = snap.data()!;
      if (data.status !== "pending") {
        return { ok: false, error: "already_resolved", status: data.status };
      }

      const now = Date.now();
      if (body.action === "approve") {
        tx.update(redemptionRef, {
          status: "approved",
          resolvedAt: now,
        });
        tx.update(kidRef, {
          spentStars: FieldValue.increment(data.costStars ?? 0),
        });
      } else {
        tx.update(redemptionRef, {
          status: "declined",
          resolvedAt: now,
        });
      }
      return { ok: true };
    });

    if (!result.ok) {
      return NextResponse.json(result, {
        status: result.error === "redemption_not_found" ? 404 : 409,
      });
    }
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const status = msg.includes("bearer") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
