"use client";

import { motion } from "framer-motion";

interface Props {
  current: number;
  total: number;
}

export function ProgressRocket({ current, total }: Props) {
  const pct = total > 0 ? Math.min(1, current / total) : 0;
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative h-4 overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className="h-full bg-sky-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
      <motion.div
        className="relative -mt-7"
        animate={{ x: `calc(${pct * 100}% - 18px)` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        <div className="w-9 text-center text-2xl">🚀</div>
      </motion.div>
      <div className="mt-1 text-center text-sm text-slate-500">
        {current} / {total}
      </div>
    </div>
  );
}
