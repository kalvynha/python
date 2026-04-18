"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import { PinGate } from "@/components/parent/PinGate";
import { SignIn } from "@/components/parent/SignIn";
import { KidCard } from "@/components/parent/KidCard";
import { NavBar } from "@/components/NavBar";

interface Kid {
  id: string;
  displayName: string;
  avatar: string;
  age: number;
  sessionDurationS: number;
  currentStreak: number;
  totalStars: number;
  baselined: boolean;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [kids, setKids] = useState<Kid[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) await ensureHouseholdAndLoad(u, setHouseholdId, setKids);
    });
    return () => unsub();
  }, []);

  if (!authReady) {
    return (
      <>
        <NavBar backTo="/" />
        <main className="mx-auto max-w-md px-6 py-20 text-center">Loading…</main>
      </>
    );
  }
  if (!user) {
    return (
      <>
        <NavBar backTo="/" />
        <SignIn />
      </>
    );
  }

  return (
    <PinGate>
      <NavBar backTo="/" exitTo="/profiles" exitLabel="Kid mode" />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Parent dashboard</h1>
          <button
            onClick={() => signOut(getFirebaseAuth())}
            className="text-sky-600 underline underline-offset-4"
          >
            Sign out
          </button>
        </div>
        <p className="mt-2 text-slate-500">Signed in as {user.email}</p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Kids</h2>
          <div className="mt-4 space-y-3">
            {kids.map((k) => (
              <KidCard key={k.id} kid={k} />
            ))}
            {kids.length === 0 && (
              <p className="text-slate-500">No kid profiles yet.</p>
            )}
          </div>
          <AddKidForm
            onAdded={(k) => setKids((prev) => [...prev, k])}
            householdId={householdId}
          />
        </section>

        <section className="mt-10 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Kid practice mode</h2>
          <p className="mt-1 text-slate-600">
            Open the kid profile picker on the device your child will use.
          </p>
          <Link href="/profiles" className="btn-primary mt-4 inline-flex">
            Open profiles
          </Link>
        </section>
      </main>
    </PinGate>
  );
}

async function ensureHouseholdAndLoad(
  user: User,
  setHid: (id: string) => void,
  setKids: (k: Kid[]) => void
) {
  const db = getDb();
  const q = query(collection(db, "households"), where("parentUid", "==", user.uid));
  const snap = await getDocs(q);
  let hid: string;
  if (snap.empty) {
    const created = await addDoc(collection(db, "households"), {
      parentUid: user.uid,
      createdAt: serverTimestamp(),
    });
    hid = created.id;
  } else {
    hid = snap.docs[0].id;
  }
  setHid(hid);
  const kidsSnap = await getDocs(collection(db, "households", hid, "kids"));
  setKids(
    kidsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        displayName: data.displayName,
        avatar: data.avatar,
        age: data.age,
        sessionDurationS: data.sessionDurationS ?? 600,
        currentStreak: data.currentStreak ?? 0,
        totalStars: data.totalStars ?? 0,
        baselined: data.baselined === true,
      };
    })
  );
}

function AddKidForm({
  householdId,
  onAdded,
}: {
  householdId: string | null;
  onAdded: (k: Kid) => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState(7);
  const [avatar, setAvatar] = useState("🦊");
  const [duration, setDuration] = useState(600);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!householdId || !name) return;
    setSaving(true);
    const db = getDb();
    const kidRef = doc(collection(db, "households", householdId, "kids"));
    const kid: Kid = {
      id: kidRef.id,
      displayName: name,
      avatar,
      age,
      sessionDurationS: duration,
      currentStreak: 0,
      totalStars: 0,
      baselined: false,
    };
    await setDoc(kidRef, {
      ...kid,
      subjectMix: { math: 0.5, spelling: 0.5 },
      interleave: true,
      createdAt: Date.now(),
    });
    onAdded(kid);
    setName("");
    setSaving(false);
  };

  const AVATARS = ["🦊", "🐼", "🦁", "🐯", "🐸", "🦄", "🐙", "🐳"];

  return (
    <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="font-semibold">Add a kid</h3>
      <div className="mt-3 space-y-3">
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-200 px-4 py-3"
        />
        <div>
          <label className="text-sm text-slate-500">Avatar</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={`rounded-xl px-3 py-2 text-2xl ${
                  avatar === a ? "bg-sky-100 ring-2 ring-sky-400" : "bg-slate-50"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <label className="flex-1 text-sm text-slate-500">
            Age
            <input
              type="number"
              min={4}
              max={12}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2"
            />
          </label>
          <label className="flex-1 text-sm text-slate-500">
            Session (min)
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2"
            >
              <option value={300}>5</option>
              <option value={600}>10</option>
              <option value={900}>15</option>
              <option value={1200}>20</option>
            </select>
          </label>
        </div>
      </div>
      <button onClick={submit} disabled={saving} className="btn-primary mt-4 w-full">
        {saving ? "Saving…" : "Add kid"}
      </button>
    </div>
  );
}
