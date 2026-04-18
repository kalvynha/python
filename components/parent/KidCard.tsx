"use client";

import Link from "next/link";

interface Props {
  kid: {
    id: string;
    displayName: string;
    avatar: string;
    age: number;
    sessionDurationS: number;
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
      </div>
      <div className="text-slate-400">→</div>
    </Link>
  );
}
