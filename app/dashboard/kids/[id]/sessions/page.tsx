"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import { PinGate } from "@/components/parent/PinGate";
import { SignIn } from "@/components/parent/SignIn";
import { NavBar } from "@/components/NavBar";

interface SessionRow {
  id: string;
  startedAt: number;
  endedAt: number | null;
  durationTargetS: number;
  questionCount: number | null;
  correctCount: number | null;
  stars: number | null;
}

export default function SessionsListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: kidId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) setSessions(await loadSessions(u.uid, kidId));
    });
    return () => unsub();
  }, [kidId]);

  if (!authReady) {
    return (
      <>
        <NavBar backTo={`/dashboard/kids/${kidId}`} />
        <main className="py-10 text-center">Loading…</main>
      </>
    );
  }
  if (!user) {
    return (
      <>
        <NavBar backTo={`/dashboard/kids/${kidId}`} />
        <SignIn />
      </>
    );
  }

  return (
    <PinGate>
      <NavBar backTo={`/dashboard/kids/${kidId}`} backLabel="Kid" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Sessions</h1>
        <p className="text-slate-500">All practice sessions, newest first.</p>

        {sessions.length === 0 ? (
          <p className="mt-8 text-slate-500">No completed sessions yet.</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/kids/${kidId}/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      {formatDate(s.startedAt)}
                    </div>
                    <div className="text-sm text-slate-500">
                      {s.questionCount != null
                        ? `${s.correctCount ?? 0} / ${s.questionCount} correct`
                        : "in progress"}
                      {" · "}
                      {Math.round(s.durationTargetS / 60)} min target
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-2xl">
                    {s.stars != null && (
                      <span>
                        {[1, 2, 3].map((n) => (
                          <span
                            key={n}
                            className={
                              n <= (s.stars ?? 0) ? "" : "grayscale opacity-30"
                            }
                          >
                            ⭐
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="text-slate-400">→</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </PinGate>
  );
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function loadSessions(uid: string, kidId: string): Promise<SessionRow[]> {
  const db = getDb();
  const hSnap = await getDocs(
    query(collection(db, "households"), where("parentUid", "==", uid))
  );
  if (hSnap.empty) return [];
  const hid = hSnap.docs[0].id;
  const snap = await getDocs(
    query(
      collection(db, "households", hid, "kids", kidId, "sessions"),
      orderBy("startedAt", "desc"),
      limit(50)
    )
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      startedAt: data.startedAt ?? 0,
      endedAt: data.endedAt ?? null,
      durationTargetS: data.durationTargetS ?? 0,
      questionCount: data.questionCount ?? null,
      correctCount: data.correctCount ?? null,
      stars: data.stars ?? null,
    };
  });
}
