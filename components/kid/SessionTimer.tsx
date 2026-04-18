"use client";

import { useEffect, useState } from "react";

interface Props {
  /** Epoch ms when the session hit its cut-off. */
  endAtMs: number;
  /** Don't render when false — controlled by the parent setting. */
  show: boolean;
}

export function SessionTimer({ endAtMs, show }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!show) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [show]);

  if (!show) return null;
  const remainingS = Math.max(0, Math.round((endAtMs - now) / 1000));
  const m = Math.floor(remainingS / 60);
  const s = remainingS % 60;
  const nearEnd = remainingS <= 60 && remainingS > 0;

  return (
    <div
      className={
        "rounded-full bg-white/80 px-3 py-1 text-sm font-semibold tabular-nums shadow-sm " +
        (nearEnd ? "text-rose-600" : "text-slate-700")
      }
      aria-label={`Time remaining: ${m} minutes ${s} seconds`}
    >
      {m}:{String(s).padStart(2, "0")}
    </div>
  );
}
