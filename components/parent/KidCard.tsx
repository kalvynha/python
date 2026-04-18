"use client";

import Link from "next/link";

interface Props {
  kid: {
    id: string;
    displayName: string;
    avatar: string;
    age: number;
    sessionDurationS: number;
    currentStreak: number;
    totalStars: number;
    baselined: boolean;
  };
}

export function KidCard({ kid }: Props) {
  return (
    <Link
      href={`/dashboard/kids/${kid.id}`}
      className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="text-5xl">{kid.avatar || "🙂"}</div>
      <div className="flex-1">
        <div className="text-lg font-semibold">{kid.displayName}</div>
        <div className="text-sm text-slate-500">
          Age {kid.age} · {Math.round(kid.sessionDurationS / 60)} min sessions
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-slate-600">
          <span title="Day streak">🔥 {kid.currentStreak}</span>
          <span title="Total stars">⭐ {kid.totalStars}</span>
          {!kid.baselined && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Baseline pending
            </span>
          )}
        </div>
      </div>
      <div className="text-slate-400">→</div>
    </Link>
  );
}
