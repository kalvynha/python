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
import { NavBar } from "@/components/NavBar";
import { MATH_SKILLS } from "@/lib/curriculum/math.seed";
import { SPELLING_SKILLS } from "@/lib/curriculum/spelling.seed";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

interface KidStats {
  totalSessions: number;
  sessionsThisWeek: number;
  totalMinutes: number;
  totalCorrect: number;
  totalQuestions: number;
  totalStars: number;
  currentStreak: number;
}

interface SkillLevelRow {
  tag: string;
  name: string;
  domain: "math" | "spelling";
  level: number;
}

interface KidDetailData {
  kid: { displayName: string; age: number } | null;
  stats: KidStats;
  weekly: Array<{ day: string; accuracy: number; count: number }>;
  skillLevels: SkillLevelRow[];
  latestFeedback: { kidSummary: string; parentSummary: string } | null;
}

const EMPTY: KidDetailData = {
  kid: null,
  stats: {
    totalSessions: 0,
    sessionsThisWeek: 0,
    totalMinutes: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    totalStars: 0,
    currentStreak: 0,
  },
  weekly: [],
  skillLevels: [],
  latestFeedback: null,
};

export default function KidDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: kidId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<KidDetailData>(EMPTY);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) setData(await loadKidData(u.uid, kidId));
    });
    return () => unsub();
  }, [kidId]);

  if (!authReady) {
    return (
      <>
        <NavBar backTo="/dashboard" />
        <main className="py-10 text-center">Loading…</main>
      </>
    );
  }
  if (!user) {
    return (
      <>
        <NavBar backTo="/dashboard" />
        <SignIn />
      </>
    );
  }

  const acc = data.stats.totalQuestions
    ? Math.round((data.stats.totalCorrect / data.stats.totalQuestions) * 100)
    : 0;

  return (
    <PinGate>
      <NavBar backTo="/dashboard" backLabel="Dashboard" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">
          {data.kid?.displayName ?? "Kid"}
        </h1>
        <p className="text-slate-500">Age {data.kid?.age}</p>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Sessions"
            value={String(data.stats.totalSessions)}
            hint={`${data.stats.sessionsThisWeek} this week`}
          />
          <StatCard
            label="Accuracy"
            value={`${acc}%`}
            hint={`${data.stats.totalCorrect}/${data.stats.totalQuestions}`}
          />
          <StatCard
            label="Practice time"
            value={formatMinutes(data.stats.totalMinutes)}
            hint="total"
          />
          <StatCard
            label="Streak"
            value={`🔥 ${data.stats.currentStreak}d`}
            hint={`⭐ ${data.stats.totalStars} stars`}
          />
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Accuracy this week</h2>
          <div className="mt-4 h-48">
            <WeeklyChart data={data.weekly} />
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Skill progress</h2>
          {data.skillLevels.length === 0 ? (
            <p className="mt-2 text-slate-500">
              Run a baseline to see skill levels.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <SkillGroup
                title="Math"
                skills={data.skillLevels.filter((s) => s.domain === "math")}
              />
              <SkillGroup
                title="Spelling"
                skills={data.skillLevels.filter(
                  (s) => s.domain === "spelling"
                )}
              />
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Latest AI feedback</h2>
          {data.latestFeedback ? (
            <>
              <p className="mt-3 whitespace-pre-line text-slate-700">
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

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function SkillGroup({
  title,
  skills,
}: {
  title: string;
  skills: SkillLevelRow[];
}) {
  if (skills.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
      <ul className="mt-2 space-y-2">
        {skills
          .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
          .map((s) => (
            <li key={s.tag}>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{s.name}</span>
                <span className="text-slate-500">Lv {s.level}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-sky-500"
                  style={{ width: `${Math.min(100, (s.level / 10) * 100)}%` }}
                />
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const ALL_SKILLS = [...MATH_SKILLS, ...SPELLING_SKILLS];

async function loadKidData(uid: string, kidId: string): Promise<KidDetailData> {
  const db = getDb();
  const hSnap = await getDocs(
    query(collection(db, "households"), where("parentUid", "==", uid))
  );
  if (hSnap.empty) return EMPTY;
  const hid = hSnap.docs[0].id;
  const kidDoc = await getDoc(doc(db, "households", hid, "kids", kidId));
  const kidData = kidDoc.exists() ? kidDoc.data() : null;
  const kid = kidData
    ? { displayName: kidData.displayName, age: kidData.age }
    : null;

  const sessionsSnap = await getDocs(
    query(
      collection(db, "households", hid, "kids", kidId, "sessions"),
      orderBy("startedAt", "desc"),
      limit(50)
    )
  );

  const now = Date.now();
  const stats: KidStats = {
    totalSessions: 0,
    sessionsThisWeek: 0,
    totalMinutes: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    totalStars: kidData?.totalStars ?? 0,
    currentStreak: kidData?.currentStreak ?? 0,
  };

  const byDay: Record<string, { correct: number; count: number }> = {};
  const attemptFetches: Array<Promise<void>> = [];

  for (const s of sessionsSnap.docs) {
    const sd = s.data();
    const completed = typeof sd.endedAt === "number" && sd.endedAt > 0;
    if (!completed) continue;
    stats.totalSessions += 1;
    if (sd.startedAt && now - sd.startedAt <= WEEK_MS) {
      stats.sessionsThisWeek += 1;
    }
    const realMs =
      sd.endedAt && sd.startedAt
        ? sd.endedAt - sd.startedAt
        : (sd.durationTargetS ?? 0) * 1000;
    stats.totalMinutes += Math.round(realMs / 60000);

    if (typeof sd.correctCount === "number") stats.totalCorrect += sd.correctCount;
    if (typeof sd.questionCount === "number")
      stats.totalQuestions += sd.questionCount;

    // Attempts for the weekly accuracy chart — only fetch for sessions
    // in the last 2 weeks to keep this fast.
    if (sd.startedAt && now - sd.startedAt <= 2 * WEEK_MS) {
      attemptFetches.push(
        (async () => {
          const aSnap = await getDocs(
            collection(
              db,
              "households",
              hid,
              "kids",
              kidId,
              "sessions",
              s.id,
              "attempts"
            )
          );
          for (const a of aSnap.docs) {
            const ad = a.data();
            const day = new Date(ad.at).toISOString().slice(0, 10);
            byDay[day] ??= { correct: 0, count: 0 };
            byDay[day].count += 1;
            if (ad.correct) byDay[day].correct += 1;
          }
        })()
      );
    }
  }

  await Promise.all(attemptFetches);

  const weekly = Object.entries(byDay)
    .map(([day, v]) => ({
      day: day.slice(5),
      accuracy: v.count > 0 ? Math.round((v.correct / v.count) * 100) : 0,
      count: v.count,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Skill levels
  const skillSnap = await getDocs(
    collection(db, "households", hid, "kids", kidId, "skillLevels")
  );
  const levelsByTag: Record<string, number> = {};
  for (const d of skillSnap.docs) {
    levelsByTag[d.id] = d.data().level ?? 0;
  }
  const skillLevels: SkillLevelRow[] = ALL_SKILLS.map((s) => ({
    tag: s.tag,
    name: s.name,
    domain: s.domain,
    level: levelsByTag[s.tag] ?? 0,
  })).filter((s) => s.level > 0);

  // Latest feedback
  let latestFeedback: KidDetailData["latestFeedback"] = null;
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

  return { kid, stats, weekly, skillLevels, latestFeedback };
}
