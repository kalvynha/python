"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";

interface Props {
  householdId: string;
  kidId: string;
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

/**
 * Roughly how many questions will fit in a session of the given length.
 * Matches pickSessionItems' SECONDS_PER_ITEM = 30 and floor-6 floor.
 */
export function estimateQuestions(seconds: number): number {
  return Math.max(6, Math.floor(seconds / 30));
}

export function KidSettings({ householdId, kidId, initial }: Props) {
  const [duration, setDuration] = useState(initial.sessionDurationS);
  const [math, setMath] = useState(initial.subjectMix.math);
  const [interleave, setInterleave] = useState(initial.interleave);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | "err">(null);

  const dirty =
    duration !== initial.sessionDurationS ||
    math !== initial.subjectMix.math ||
    interleave !== initial.interleave;

  const save = async () => {
    setSaving(true);
    setSaved(null);
    try {
      const db = getDb();
      await updateDoc(
        doc(db, "households", householdId, "kids", kidId),
        {
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

  return (
    <div className="space-y-5">
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
            {Math.round(math * 100)}% math ·{" "}
            {Math.round((1 - math) * 100)}% spelling
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
    </div>
  );
}
