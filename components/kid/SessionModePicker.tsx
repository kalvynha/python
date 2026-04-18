"use client";

import { motion } from "framer-motion";

type Mode = "math" | "spelling" | "both";

interface Props {
  onPick: (mode: Mode) => void;
}

/**
 * First screen in a session: kid chooses what to practice today.
 * "Both" uses the parent's configured mix; math-only and spelling-only
 * override it to 100% one subject for this session only.
 */
export function SessionModePicker({ onPick }: Props) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl px-4 py-10 text-center sm:px-6"
    >
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
        What do you want to practice?
      </h1>
      <p className="mt-2 text-slate-500">Pick anything — you can switch next time.</p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ModeButton
          label="Math"
          emoji="🔢"
          subtitle="Numbers only"
          color="sky"
          onClick={() => onPick("math")}
        />
        <ModeButton
          label="Spelling"
          emoji="🔤"
          subtitle="Words only"
          color="violet"
          onClick={() => onPick("spelling")}
        />
        <ModeButton
          label="Both"
          emoji="🎲"
          subtitle="A mix of everything"
          color="amber"
          onClick={() => onPick("both")}
        />
      </div>
    </motion.main>
  );
}

function ModeButton({
  label,
  emoji,
  subtitle,
  color,
  onClick,
}: {
  label: string;
  emoji: string;
  subtitle: string;
  color: "sky" | "violet" | "amber";
  onClick: () => void;
}) {
  const colorClasses: Record<typeof color, string> = {
    sky: "bg-sky-50 text-sky-900 hover:bg-sky-100 border-sky-200 hover:border-sky-400",
    violet:
      "bg-violet-50 text-violet-900 hover:bg-violet-100 border-violet-200 hover:border-violet-400",
    amber:
      "bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-200 hover:border-amber-400",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group flex h-48 flex-col items-center justify-center gap-2 rounded-3xl border-2 p-6 shadow-sm transition active:scale-95 " +
        colorClasses[color]
      }
    >
      <div className="text-6xl transition group-hover:scale-110">{emoji}</div>
      <div className="text-2xl font-bold">{label}</div>
      <div className="text-sm font-normal opacity-70">{subtitle}</div>
    </button>
  );
}
