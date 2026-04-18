"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import { NavBar } from "@/components/NavBar";

interface KidProfile {
  id: string;
  displayName: string;
  avatar: string;
  householdId: string;
  baselined: boolean;
  currentStreak: number;
  totalStars: number;
  lastSessionDay?: string;
}

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProfilesPage() {
  const router = useRouter();
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      if (!u) {
        setLoading(false);
        return;
      }
      loadKids(u.uid)
        .then(setKids)
        .finally(() => setLoading(false));
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <>
        <NavBar backTo="/" />
        <main className="mx-auto max-w-xl px-6 py-16 text-center">
          Loading…
        </main>
      </>
    );
  }
  if (!user) {
    return (
      <>
        <NavBar backTo="/" />
        <main className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="text-xl text-slate-700">
            Please sign in as a parent first.
          </p>
          <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
            Go to parent dashboard
          </Link>
        </main>
      </>
    );
  }

  const go = (k: KidProfile) => {
    router.push(
      k.baselined ? `/play?kidId=${k.id}` : `/baseline?kidId=${k.id}`
    );
  };

  const today = todayLocalISO();

  return (
    <>
      <NavBar backTo="/" exitTo="/dashboard" exitLabel="Parent area" />
      <main className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-around text-4xl opacity-40 sm:text-5xl"
        >
          <span>☁️</span>
          <span>🌟</span>
          <span>☁️</span>
          <span>🌈</span>
          <span>☁️</span>
        </div>
        <h1 className="mt-12 text-center text-3xl font-bold text-slate-800 sm:text-4xl">
          Who&apos;s practicing?
        </h1>
        <p className="mt-1 text-center text-slate-500">
          Tap your name to get started.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {kids.map((k) => {
            const practicedToday = k.lastSessionDay === today;
            return (
              <button
                key={k.id}
                onClick={() => go(k)}
                className="group relative flex flex-col items-center rounded-3xl bg-white p-5 shadow-md transition hover:-translate-y-1 hover:shadow-lg"
              >
                {practicedToday && (
                  <span
                    className="absolute right-2 top-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                    title="Already practiced today"
                  >
                    ✓ today
                  </span>
                )}
                <div className="text-6xl transition group-hover:scale-110">
                  {k.avatar || "🙂"}
                </div>
                <div className="mt-3 text-lg font-semibold text-slate-800">
                  {k.displayName}
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm text-slate-500">
                  {k.currentStreak > 0 && (
                    <span title="Day streak">🔥 {k.currentStreak}</span>
                  )}
                  {k.totalStars > 0 && (
                    <span title="Stars earned">⭐ {k.totalStars}</span>
                  )}
                </div>
                {!k.baselined && (
                  <span className="mt-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Start here
                  </span>
                )}
              </button>
            );
          })}
          {kids.length === 0 && (
            <p className="col-span-full text-center text-slate-500">
              No kid profiles yet. Add one from the parent dashboard.
            </p>
          )}
        </div>
      </main>
    </>
  );
}

async function loadKids(uid: string): Promise<KidProfile[]> {
  const db = getDb();
  const q = query(collection(db, "households"), where("parentUid", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return [];
  const hh = snap.docs[0];
  const kidsSnap = await getDocs(collection(db, "households", hh.id, "kids"));
  return kidsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      displayName: data.displayName,
      avatar: data.avatar,
      householdId: hh.id,
      baselined: data.baselined === true,
      currentStreak: data.currentStreak ?? 0,
      totalStars: data.totalStars ?? 0,
      lastSessionDay: data.lastSessionDay,
    };
  });
}
