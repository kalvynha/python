"use client";

import { use, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import { PinGate } from "@/components/parent/PinGate";
import { WeeklyChart } from "@/components/parent/WeeklyChart";
import { SignIn } from "@/components/parent/SignIn";

export default function KidDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: kidId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<{
    kid: { displayName: string; age: number } | null;
    weekly: Array<{ day: string; accuracy: number; count: number }>;
    latestFeedback: { kidSummary: string; parentSummary: string } | null;
  }>({ kid: null, weekly: [], latestFeedback: null });

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) setData(await loadKidData(u.uid, kidId));
    });
    return () => unsub();
  }, [kidId]);

  if (!authReady) return <main className="py-10 text-center">Loading…</main>;
  if (!user) return <SignIn />;

  return (
    <PinGate>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold">
          {data.kid?.displayName ?? "Kid"}
        </h1>
        <p className="text-slate-500">Age {data.kid?.age}</p>

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">This week</h2>
          <div className="mt-4 h-48">
            <WeeklyChart data={data.weekly} />
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Latest AI feedback</h2>
          {data.latestFeedback ? (
            <>
              <p className="mt-3 text-slate-700">
                <strong>For you:</strong> {data.latestFeedback.parentSummary}
              </p>
              <p className="mt-3 text-slate-700">
                <strong>For your child:</strong>{" "}
                {data.latestFeedback.kidSummary}
              </p>
            </>
          ) : (
            <p className="mt-2 text-slate-500">
              No sessions yet. Have them run a practice session to see feedback.
            </p>
          )}
        </section>
      </main>
    </PinGate>
  );
}

async function loadKidData(uid: string, kidId: string) {
  const db = getDb();
  const hSnap = await getDocs(
    query(collection(db, "households"), where("parentUid", "==", uid))
  );
  if (hSnap.empty) return { kid: null, weekly: [], latestFeedback: null };
  const hid = hSnap.docs[0].id;
  const kidDoc = await getDoc(doc(db, "households", hid, "kids", kidId));
  const kid = kidDoc.exists()
    ? { displayName: kidDoc.data().displayName, age: kidDoc.data().age }
    : null;

  // Weekly accuracy: walk recent sessions' attempts
  const sessionsSnap = await getDocs(
    query(
      collection(db, "households", hid, "kids", kidId, "sessions"),
      orderBy("startedAt", "desc"),
      limit(10)
    )
  );
  const byDay: Record<string, { correct: number; count: number }> = {};
  for (const s of sessionsSnap.docs) {
    const aSnap = await getDocs(
      collection(db, "households", hid, "kids", kidId, "sessions", s.id, "attempts")
    );
    for (const a of aSnap.docs) {
      const d = new Date(a.data().at).toISOString().slice(0, 10);
      byDay[d] ??= { correct: 0, count: 0 };
      byDay[d].count += 1;
      if (a.data().correct) byDay[d].correct += 1;
    }
  }
  const weekly = Object.entries(byDay)
    .map(([day, v]) => ({
      day: day.slice(5),
      accuracy: v.count > 0 ? Math.round((v.correct / v.count) * 100) : 0,
      count: v.count,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Latest feedback
  let latestFeedback: { kidSummary: string; parentSummary: string } | null = null;
  for (const s of sessionsSnap.docs) {
    const fb = await getDoc(
      doc(
        db,
        "households",
        hid,
        "kids",
        kidId,
        "sessions",
        s.id,
        "feedback",
        "summary"
      )
    );
    if (fb.exists()) {
      latestFeedback = {
        kidSummary: fb.data()!.kidSummary,
        parentSummary: fb.data()!.parentSummary,
      };
      break;
    }
  }

  return { kid, weekly, latestFeedback };
}
