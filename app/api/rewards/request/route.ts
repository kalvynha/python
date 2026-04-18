import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * Kid requests a reward. We validate the reward exists, unarchived,
 * and that the kid has enough available stars (totalStars - spentStars).
 * A redemption doc is written with status="pending" for the parent to
 * approve/decline later.
 */

const Body = z.object({
  kidId: z.string(),
  rewardId: z.string(),
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
    const householdRef = hSnap.docs[0].ref;
    const kidRef = householdRef.collection("kids").doc(body.kidId);
    const rewardRef = kidRef.collection("rewards").doc(body.rewardId);

    const result = await db.runTransaction(async (tx) => {
      const [kidSnap, rewardSnap] = await Promise.all([
        tx.get(kidRef),
        tx.get(rewardRef),
      ]);
      if (!kidSnap.exists) return { ok: false, error: "kid_not_found" };
      if (!rewardSnap.exists) return { ok: false, error: "reward_not_found" };
      const reward = rewardSnap.data()!;
      if (reward.archived) return { ok: false, error: "reward_archived" };

      const kid = kidSnap.data()!;
      const total = (kid.totalStars as number | undefined) ?? 0;
      const spent = (kid.spentStars as number | undefined) ?? 0;

      // Reserve stars against outstanding pending requests too, so
      // a kid can't request 5 rewards on 10 stars.
      const pendingSnap = await tx.get(
        kidRef.collection("redemptions").where("status", "==", "pending")
      );
      const reserved = pendingSnap.docs.reduce(
        (sum, d) => sum + ((d.data().costStars as number) ?? 0),
        0
      );
      const available = total - spent - reserved;

      const cost = (reward.costStars as number) ?? 0;
      if (available < cost) {
        return { ok: false, error: "insufficient_stars", available };
      }

      const id = randomUUID();
      tx.set(kidRef.collection("redemptions").doc(id), {
        id,
        rewardId: body.rewardId,
        rewardTitle: reward.title ?? "Reward",
        rewardEmoji: reward.emoji ?? "🎁",
        costStars: cost,
        status: "pending",
        requestedAt: Date.now(),
      });
      return { ok: true, redemptionId: id };
    });

    if (!result.ok) {
      const status =
        result.error === "insufficient_stars"
          ? 400
          : result.error?.endsWith("not_found")
            ? 404
            : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const status = msg.includes("bearer") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
