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
  where,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import { PinGate } from "@/components/parent/PinGate";
import { SignIn } from "@/components/parent/SignIn";
import { NavBar } from "@/components/NavBar";

interface AttemptRow {
  id: string;
  itemId: string;
  skillTag: string;
  prompt: string;
  expected: string;
  given: string;
  correct: boolean;
  timeMs: number;
  hintUsed: boolean;
  at: number;
}

interface SessionDetail {
  startedAt: number;
  endedAt: number | null;
  durationTargetS: number;
  questionCount: number | null;
  correctCount: number | null;
  stars: number | null;
  parentSummary: string | null;
  attempts: AttemptRow[];
}

const EMPTY: SessionDetail = {
  startedAt: 0,
  endedAt: null,
  durationTargetS: 0,
  questionCount: null,
  correctCount: null,
  stars: null,
  parentSummary: null,
  attempts: [],
};

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id: kidId, sid } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<SessionDetail>(EMPTY);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) setData(await loadSession(u.uid, kidId, sid));
    });
    return () => unsub();
  }, [kidId, sid]);

  if (!authReady) {
    return (
      <>
        <NavBar backTo={`/dashboard/kids/${kidId}/sessions`} />
        <main className="py-10 text-center">Loading…</main>
      </>
    );
  }
  if (!user) {
    return (
      <>
        <NavBar backTo={`/dashboard/kids/${kidId}/sessions`} />
        <SignIn />
      </>
    );
  }

  const grouped = groupByItem(data.attempts);

  return (
    <PinGate>
      <NavBar
        backTo={`/dashboard/kids/${kidId}/sessions`}
        backLabel="Sessions"
      />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold">
          Session — {data.startedAt ? formatDate(data.startedAt) : "?"}
        </h1>
        <p className="mt-1 text-slate-500">
          {data.correctCount != null && data.questionCount != null
            ? `${data.correctCount} / ${data.questionCount} correct`
            : "in progress"}
          {data.stars != null && ` · ${"⭐".repeat(data.stars)}`}
        </p>

        {data.parentSummary && (
          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold">AI report</h2>
            <p className="mt-3 whitespace-pre-line text-slate-700">
              {data.parentSummary}
            </p>
          </section>
        )}

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Question by question</h2>
          {grouped.length === 0 ? (
            <p className="mt-2 text-slate-500">No attempts recorded.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {grouped.map((g, i) => {
                const finalCorrect = g.attempts.some((a) => a.correct);
                return (
                  <li
                    key={g.itemId}
                    className={
                      "rounded-xl border-2 p-4 " +
                      (finalCorrect
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-rose-200 bg-rose-50")
                    }
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-slate-500">
                          #{i + 1} · {g.skillTag}
                        </div>
                        <div className="mt-1 text-lg font-semibold">
                          {g.prompt}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">
                          Correct answer
                        </div>
                        <div className="font-mono">{g.expected}</div>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm">
                      {g.attempts.map((a) => (
                        <li key={a.id} className="flex items-center gap-3">
                          <span
                            className={
                              "inline-block w-5 text-center " +
                              (a.correct
                                ? "text-emerald-600"
                                : "text-rose-600")
                            }
                          >
                            {a.correct ? "✓" : "✗"}
                          </span>
                          <span className="font-mono">
                            {a.given || <em className="text-slate-400">(blank)</em>}
                          </span>
                          <span className="text-slate-400">
                            · {(a.timeMs / 1000).toFixed(1)}s
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </PinGate>
  );
}

interface GroupedItem {
  itemId: string;
  skillTag: string;
  prompt: string;
  expected: string;
  attempts: AttemptRow[];
}

function groupByItem(attempts: AttemptRow[]): GroupedItem[] {
  const order: string[] = [];
  const map = new Map<string, GroupedItem>();
  for (const a of [...attempts].sort((x, y) => x.at - y.at)) {
    if (!map.has(a.itemId)) {
      order.push(a.itemId);
      map.set(a.itemId, {
        itemId: a.itemId,
        skillTag: a.skillTag,
        prompt: a.prompt,
        expected: a.expected,
        attempts: [],
      });
    }
    map.get(a.itemId)!.attempts.push(a);
  }
  return order.map((id) => map.get(id)!);
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

async function loadSession(
  uid: string,
  kidId: string,
  sid: string
): Promise<SessionDetail> {
  const db = getDb();
  const hSnap = await getDocs(
    query(collection(db, "households"), where("parentUid", "==", uid))
  );
  if (hSnap.empty) return EMPTY;
  const hid = hSnap.docs[0].id;
  const sessionRef = doc(db, "households", hid, "kids", kidId, "sessions", sid);
  const sessionSnap = await getDoc(sessionRef);
  if (!sessionSnap.exists()) return EMPTY;
  const sd = sessionSnap.data();

  const attemptsSnap = await getDocs(
    query(
      collection(
        db,
        "households",
        hid,
        "kids",
        kidId,
        "sessions",
        sid,
        "attempts"
      ),
      orderBy("at", "asc")
    )
  );
  const attempts: AttemptRow[] = attemptsSnap.docs.map((d) => {
    const a = d.data();
    return {
      id: d.id,
      itemId: a.itemId,
      skillTag: a.skillTag,
      prompt: a.prompt,
      expected: a.expected,
      given: a.given,
      correct: !!a.correct,
      timeMs: a.timeMs ?? 0,
      hintUsed: !!a.hintUsed,
      at: a.at ?? 0,
    };
  });

  const fbSnap = await getDoc(
    doc(
      db,
      "households",
      hid,
      "kids",
      kidId,
      "sessions",
      sid,
      "feedback",
      "summary"
    )
  );
  const parentSummary = fbSnap.exists() ? fbSnap.data()!.parentSummary : null;

  return {
    startedAt: sd.startedAt ?? 0,
    endedAt: sd.endedAt ?? null,
    durationTargetS: sd.durationTargetS ?? 0,
    questionCount: sd.questionCount ?? null,
    correctCount: sd.correctCount ?? null,
    stars: sd.stars ?? null,
    parentSummary,
    attempts,
  };
}
