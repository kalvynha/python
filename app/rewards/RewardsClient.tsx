"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/client/authedFetch";
import { NavBar } from "@/components/NavBar";

interface Reward {
  id: string;
  title: string;
  emoji: string;
  costStars: number;
  description?: string;
}

interface Redemption {
  id: string;
  rewardId: string;
  rewardTitle: string;
  costStars: number;
  status: "pending" | "approved" | "declined";
  requestedAt: number;
}

export function RewardsClient() {
  const search = useSearchParams();
  const kidId = search.get("kidId");
  const [user, setUser] = useState<User | null>(null);
  const [kidName, setKidName] = useState("");
  const [total, setTotal] = useState(0);
  const [spent, setSpent] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pending, setPending] = useState<Redemption[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const reload = async (uid: string) => {
    if (!kidId) return;
    const db = getDb();
    const hSnap = await getDocs(
      query(collection(db, "households"), where("parentUid", "==", uid))
    );
    if (hSnap.empty) return;
    const hid = hSnap.docs[0].id;
    const kidRef = doc(db, "households", hid, "kids", kidId);
    const kidSnap = await getDoc(kidRef);
    if (kidSnap.exists()) {
      const k = kidSnap.data()!;
      setKidName(k.displayName ?? "");
      setTotal(k.totalStars ?? 0);
      setSpent(k.spentStars ?? 0);
    }
    const [rewardsSnap, redemptionsSnap] = await Promise.all([
      getDocs(collection(kidRef, "rewards")),
      getDocs(
        query(
          collection(kidRef, "redemptions"),
          where("status", "==", "pending")
        )
      ),
    ]);
    setRewards(
      rewardsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Reward & { archived?: boolean })
        .filter((r) => !("archived" in r && r.archived))
        .sort((a, b) => a.costStars - b.costStars)
    );
    setPending(
      redemptionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Redemption)
    );
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      if (u) await reload(u.uid);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidId]);

  if (!kidId) {
    return (
      <>
        <NavBar backTo="/profiles" />
        <main className="mx-auto max-w-xl px-6 py-16 text-center">
          Missing kid id.
        </main>
      </>
    );
  }
  if (!user) {
    return (
      <>
        <NavBar backTo="/profiles" />
        <main className="mx-auto max-w-xl px-6 py-16 text-center">
          Please sign in first.
        </main>
      </>
    );
  }

  const pendingCost = pending.reduce((s, p) => s + p.costStars, 0);
  const available = Math.max(0, total - spent - pendingCost);
  const pendingIds = new Set(pending.map((p) => p.rewardId));

  const request = async (reward: Reward) => {
    setBusyId(reward.id);
    setNote(null);
    try {
      const res = await authedFetch("/api/rewards/request", {
        method: "POST",
        body: JSON.stringify({ kidId, rewardId: reward.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNote(
          data.error === "insufficient_stars"
            ? "Not enough stars yet — keep practicing!"
            : "Couldn't request this: " + data.error
        );
      } else {
        setNote(`Sent a request for ${reward.title} 🎉`);
        if (user) await reload(user.uid);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <NavBar backTo="/profiles" />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold">
          {kidName ? `${kidName}'s rewards` : "Rewards"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-lg">
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
            ⭐ {available} stars
          </span>
          {pending.length > 0 && (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800">
              {pending.length} waiting for grown-up
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {total} earned · {spent} spent
        </p>

        {note && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-800">
            {note}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rewards.map((r) => {
            const canAfford = available >= r.costStars;
            const isPending = pendingIds.has(r.id);
            return (
              <div
                key={r.id}
                className="flex flex-col rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="text-5xl">{r.emoji}</div>
                <div className="mt-3 text-xl font-semibold">{r.title}</div>
                {r.description && (
                  <div className="mt-1 text-sm text-slate-500">
                    {r.description}
                  </div>
                )}
                <div className="mt-3 text-lg font-semibold text-amber-700">
                  ⭐ {r.costStars}
                </div>
                <button
                  onClick={() => request(r)}
                  disabled={!canAfford || isPending || busyId === r.id}
                  className={
                    "mt-4 rounded-xl py-3 font-semibold " +
                    (isPending
                      ? "bg-sky-100 text-sky-700"
                      : canAfford
                        ? "bg-sky-500 text-white hover:bg-sky-600"
                        : "bg-slate-100 text-slate-500")
                  }
                >
                  {isPending
                    ? "Waiting for grown-up…"
                    : canAfford
                      ? "Request"
                      : `Need ${r.costStars - available} more ⭐`}
                </button>
              </div>
            );
          })}
        </div>
        {rewards.length === 0 && (
          <p className="mt-10 text-center text-slate-500">
            Your grown-up hasn&apos;t added any rewards yet.
          </p>
        )}
      </main>
    </>
  );
}
