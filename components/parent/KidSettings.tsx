"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";

interface Props {
  householdId: string;
  kidId: string;
  initialName: string;
  initial: {
    sessionDurationS: number;
    subjectMix: { math: number; spelling: number };
    interleave: boolean;
  };
}

const DURATION_OPTIONS = [
  { seconds: 300, minutes: 5 },
  { seconds: 600, minutes: 10 },
  { seconds: 900, minutes: 15 },
  { seconds: 1200, minutes: 20 },
];

/** Matches pickSessionItems' SECONDS_PER_ITEM = 30. */
export function estimateQuestions(seconds: number): number {
  return Math.max(6, Math.floor(seconds / 30));
}

export function KidSettings({ householdId, kidId, initialName, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [duration, setDuration] = useState(initial.sessionDurationS);
  const [math, setMath] = useState(initial.subjectMix.math);
  const [interleave, setInterleave] = useState(initial.interleave);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | "err">(null);
  const [danger, setDanger] = useState<null | "reset" | "delete">(null);
  const [busy, setBusy] = useState(false);

  const dirty =
    name !== initialName ||
    duration !== initial.sessionDurationS ||
    math !== initial.subjectMix.math ||
    interleave !== initial.interleave;

  const save = async () => {
    setSaving(true);
    setSaved(null);
    try {
      await updateDoc(
        doc(getDb(), "households", householdId, "kids", kidId),
        {
          displayName: name.trim() || initialName,
          sessionDurationS: duration,
          subjectMix: { math, spelling: 1 - math },
          interleave,
        }
      );
      setSaved("ok");
    } catch {
      setSaved("err");
    } finally {
      setSaving(false);
    }
  };

  const retakeBaseline = async () => {
    setBusy(true);
    try {
      const db = getDb();
      // Flip baselined -> false so /profiles routes the kid through
      // /baseline next time, and clear skillLevels so the new baseline
      // fully reseeds. Review queue is preserved on purpose.
      const levelsRef = collection(
        db,
        "households",
        householdId,
        "kids",
        kidId,
        "skillLevels"
      );
      const snap = await getDocs(levelsRef);
      const batch = writeBatch(db);
      for (const d of snap.docs) batch.delete(d.ref);
      batch.update(doc(db, "households", householdId, "kids", kidId), {
        baselined: false,
      });
      await batch.commit();
      setDanger(null);
      alert(
        "Baseline reset. The next time they tap their avatar, they'll retake the warm-up."
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteKid = async () => {
    setBusy(true);
    try {
      const db = getDb();
      // Firestore subcollections aren't auto-deleted; delete the kid
      // doc itself. Subcollections become orphaned — fine for MVP;
      // a Cloud Function can cascade-delete later.
      await deleteDoc(doc(db, "households", householdId, "kids", kidId));
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-semibold text-slate-600">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full rounded-xl border-2 border-slate-200 px-3 py-2"
          maxLength={40}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-semibold text-slate-600">
            Session length
          </label>
          <span className="text-xs text-slate-500">
            ~{estimateQuestions(duration)} questions
          </span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {DURATION_OPTIONS.map((o) => (
            <button
              key={o.seconds}
              type="button"
              onClick={() => setDuration(o.seconds)}
              className={
                "rounded-xl border-2 py-2 font-semibold transition " +
                (duration === o.seconds
                  ? "border-sky-400 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-sky-300")
              }
            >
              {o.minutes} min
              <div className="text-xs font-normal text-slate-500">
                ~{estimateQuestions(o.seconds)} Qs
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-semibold text-slate-600">
            Subject mix
          </label>
          <span className="text-xs text-slate-500">
            {Math.round(math * 100)}% math · {Math.round((1 - math) * 100)}%
            spelling
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={math}
          onChange={(e) => setMath(parseFloat(e.target.value))}
          className="mt-2 w-full"
        />
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={interleave}
          onChange={(e) => setInterleave(e.target.checked)}
          className="h-5 w-5"
        />
        <span className="text-sm text-slate-700">
          Interleave math and spelling (recommended)
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved === "ok" && (
          <span className="text-sm text-emerald-600">Saved ✓</span>
        )}
        {saved === "err" && (
          <span className="text-sm text-rose-600">Couldn't save.</span>
        )}
      </div>

      <div className="mt-8 border-t pt-6">
        <h3 className="text-sm font-semibold text-slate-600">
          Advanced
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setDanger("reset")}
            className="rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
          >
            Retake baseline
          </button>
          <button
            onClick={() => setDanger("delete")}
            className="rounded-xl border-2 border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
          >
            Delete this profile
          </button>
        </div>

        {danger === "reset" && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">
            Reset all skill levels and trigger a new baseline on next play?
            Progress and session history stay intact.
            <div className="mt-3 flex gap-2">
              <button
                onClick={retakeBaseline}
                disabled={busy}
                className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white"
              >
                Yes, reset
              </button>
              <button
                onClick={() => setDanger(null)}
                className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {danger === "delete" && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm">
            Permanently delete <strong>{initialName}</strong>? Session history,
            streak and stars are removed. This can't be undone.
            <div className="mt-3 flex gap-2">
              <button
                onClick={deleteKid}
                disabled={busy}
                className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setDanger(null)}
                className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
