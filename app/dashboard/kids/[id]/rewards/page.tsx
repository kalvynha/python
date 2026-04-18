"use client";

import { use, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/client/authedFetch";
import { PinGate } from "@/components/parent/PinGate";
import { SignIn } from "@/components/parent/SignIn";
import { NavBar } from "@/components/NavBar";

interface Reward {
  id: string;
  title: string;
  emoji: string;
  costStars: number;
  description?: string;
  archived: boolean;
}

interface Redemption {
  id: string;
  rewardId: string;
  rewardTitle: string;
  rewardEmoji: string;
  costStars: number;
  status: "pending" | "approved" | "declined";
  requestedAt: number;
}

export default function RewardsAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: kidId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pending, setPending] = useState<Redemption[]>([]);
  const [kidName, setKidName] = useState("");
  const [balance, setBalance] = useState({ total: 0, spent: 0 });

  const reload = async (hid: string) => {
    const db = getDb();
    const kidRef = doc(db, "households", hid, "kids", kidId);
    const kidSnap = await getDocs(
      query(collection(db, "households", hid, "kids"), where("__name__", "==", kidId))
    );
    if (!kidSnap.empty) {
      const k = kidSnap.docs[0].data();
      setKidName(k.displayName ?? "");
      setBalance({
        total: k.totalStars ?? 0,
        spent: k.spentStars ?? 0,
      });
    }
    const [rewardsSnap, redemptionsSnap] = await Promise.all([
      getDocs(collection(kidRef, "rewards")),
      getDocs(
        query(collection(kidRef, "redemptions"), where("status", "==", "pending"))
      ),
    ]);
    setRewards(
      rewardsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reward)
    );
    setPending(
      redemptionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Redemption)
    );
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) return;
      const hSnap = await getDocs(
        query(collection(getDb(), "households"), where("parentUid", "==", u.uid))
      );
      if (hSnap.empty) return;
      const hid = hSnap.docs[0].id;
      setHouseholdId(hid);
      await reload(hid);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const resolve = async (redemptionId: string, action: "approve" | "decline") => {
    const res = await authedFetch("/api/rewards/resolve", {
      method: "POST",
      body: JSON.stringify({ kidId, redemptionId, action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert("Couldn't update: " + (data.error ?? res.status));
    }
    if (householdId) await reload(householdId);
  };

  const available = Math.max(0, balance.total - balance.spent);

  return (
    <PinGate>
      <NavBar backTo={`/dashboard/kids/${kidId}`} backLabel="Kid" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-3xl font-bold">Rewards for {kidName}</h1>
        <p className="mt-1 text-slate-500">
          ⭐ {available} available · {balance.total} earned ·{" "}
          {balance.spent} spent
        </p>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">
            Pending requests{" "}
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-sm text-amber-700">
                {pending.length}
              </span>
            )}
          </h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-slate-500">Nothing waiting.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pending.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-3"
                >
                  <div className="text-3xl">{r.rewardEmoji}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{r.rewardTitle}</div>
                    <div className="text-sm text-slate-600">
                      ⭐ {r.costStars} ·{" "}
                      {new Date(r.requestedAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => resolve(r.id, "approve")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => resolve(r.id, "decline")}
                    className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700 border-2 border-slate-200"
                  >
                    Decline
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Reward catalog</h2>
          <p className="mt-1 text-sm text-slate-500">
            These are what your kid can shop for with their stars.
          </p>
          <div className="mt-4 space-y-3">
            {rewards
              .filter((r) => !r.archived)
              .map((r) => (
                <RewardRow
                  key={r.id}
                  reward={r}
                  householdId={householdId}
                  kidId={kidId}
                  onChange={() => householdId && reload(householdId)}
                />
              ))}
            {rewards.filter((r) => !r.archived).length === 0 && (
              <p className="text-slate-500">
                No rewards yet — add one below.
              </p>
            )}
          </div>
          {householdId && (
            <RewardEditor
              householdId={householdId}
              kidId={kidId}
              onSaved={() => householdId && reload(householdId)}
            />
          )}
        </section>
      </main>
    </PinGate>
  );
}

function RewardRow({
  reward,
  householdId,
  kidId,
  onChange,
}: {
  reward: Reward;
  householdId: string | null;
  kidId: string;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(reward.title);
  const [emoji, setEmoji] = useState(reward.emoji);
  const [cost, setCost] = useState(reward.costStars);
  const [description, setDescription] = useState(reward.description ?? "");

  const save = async () => {
    if (!householdId) return;
    await updateDoc(
      doc(
        getDb(),
        "households",
        householdId,
        "kids",
        kidId,
        "rewards",
        reward.id
      ),
      { title, emoji, costStars: cost, description }
    );
    setEditing(false);
    onChange();
  };

  const archive = async () => {
    if (!householdId) return;
    if (!window.confirm("Archive this reward? Past requests stay intact.")) return;
    await updateDoc(
      doc(
        getDb(),
        "households",
        householdId,
        "kids",
        kidId,
        "rewards",
        reward.id
      ),
      { archived: true }
    );
    onChange();
  };

  const remove = async () => {
    if (!householdId) return;
    if (!window.confirm("Delete this reward permanently?")) return;
    await deleteDoc(
      doc(
        getDb(),
        "households",
        householdId,
        "kids",
        kidId,
        "rewards",
        reward.id
      )
    );
    onChange();
  };

  if (editing) {
    return (
      <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-3 space-y-2">
        <div className="flex gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-14 rounded-lg border-2 border-slate-200 px-2 py-1 text-center text-2xl"
            maxLength={4}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-lg border-2 border-slate-200 px-3 py-1"
            maxLength={60}
          />
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(parseInt(e.target.value || "0", 10))}
            className="w-24 rounded-lg border-2 border-slate-200 px-2 py-1"
          />
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional note"
          className="w-full rounded-lg border-2 border-slate-200 px-3 py-1 text-sm"
          maxLength={240}
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-slate-100 p-3">
      <div className="text-3xl">{reward.emoji}</div>
      <div className="flex-1">
        <div className="font-semibold">{reward.title}</div>
        <div className="text-sm text-slate-500">
          ⭐ {reward.costStars}
          {reward.description && ` · ${reward.description}`}
        </div>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="rounded-lg border-2 border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700"
      >
        Edit
      </button>
      <button
        onClick={archive}
        className="rounded-lg bg-white px-2 py-1 text-sm font-semibold text-amber-700"
      >
        Archive
      </button>
      <button
        onClick={remove}
        className="rounded-lg bg-white px-2 py-1 text-sm font-semibold text-rose-700"
      >
        Delete
      </button>
    </div>
  );
}

function RewardEditor({
  householdId,
  kidId,
  onSaved,
}: {
  householdId: string;
  kidId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🍦");
  const [cost, setCost] = useState(20);
  const [description, setDescription] = useState("");

  const EMOJI_OPTIONS = ["🍦", "🎬", "🎮", "📚", "🎁", "🍪", "🎡", "🏊", "🎨", "⚽"];

  const save = async () => {
    if (!title.trim()) return;
    const db = getDb();
    const ref = doc(
      collection(db, "households", householdId, "kids", kidId, "rewards")
    );
    await setDoc(ref, {
      id: ref.id,
      title: title.trim(),
      emoji,
      costStars: cost,
      description: description.trim() || undefined,
      archived: false,
      createdAt: Date.now(),
    });
    setTitle("");
    setDescription("");
    setOpen(false);
    onSaved();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-primary mt-4 w-full"
      >
        + Add a reward
      </button>
    );
  }
  return (
    <div className="mt-4 rounded-xl bg-sky-50 p-3 space-y-3">
      <div>
        <label className="text-sm font-semibold text-slate-600">Emoji</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={
                "rounded-lg px-2 py-1 text-2xl " +
                (emoji === e ? "bg-white ring-2 ring-sky-400" : "bg-white/50")
              }
            >
              {e}
            </button>
          ))}
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-14 rounded-lg border-2 border-slate-200 px-2 py-1 text-center text-2xl"
            maxLength={4}
            placeholder="?"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Ice cream trip"
          className="flex-1 rounded-lg border-2 border-slate-200 px-3 py-2"
          maxLength={60}
        />
        <input
          type="number"
          min={1}
          value={cost}
          onChange={(e) => setCost(parseInt(e.target.value || "0", 10))}
          className="w-24 rounded-lg border-2 border-slate-200 px-2 py-2"
          title="Stars cost"
        />
      </div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional note (e.g. any flavor, Friday only)"
        className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm"
        maxLength={240}
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={!title.trim()}
          className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
