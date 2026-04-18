"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";

interface KidProfile {
  id: string;
  displayName: string;
  avatar: string;
  householdId: string;
}

export default function ProfilesPage() {
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
    return <main className="mx-auto max-w-xl px-6 py-16 text-center">Loading…</main>;
  }
  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-xl text-slate-700">Please sign in as a parent first.</p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
          Go to parent dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-center text-3xl font-bold">Who's practicing?</h1>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {kids.map((k) => (
          <Link
            key={k.id}
            href={`/play?kidId=${k.id}`}
            className="flex flex-col items-center rounded-3xl bg-white p-6 shadow-md transition hover:-translate-y-1"
          >
            <div className="text-6xl">{k.avatar || "🙂"}</div>
            <div className="mt-3 text-lg font-semibold">{k.displayName}</div>
          </Link>
        ))}
        {kids.length === 0 && (
          <p className="col-span-full text-center text-slate-500">
            No kid profiles yet. Add one from the parent dashboard.
          </p>
        )}
      </div>
    </main>
  );
}

async function loadKids(uid: string): Promise<KidProfile[]> {
  const db = getDb();
  const q = query(collection(db, "households"), where("parentUid", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return [];
  const hh = snap.docs[0];
  const kidsSnap = await getDocs(collection(db, "households", hh.id, "kids"));
  return kidsSnap.docs.map((d) => ({
    id: d.id,
    displayName: d.data().displayName,
    avatar: d.data().avatar,
    householdId: hh.id,
  }));
}
