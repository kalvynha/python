"use client";

import { AnimatePresence, motion } from "framer-motion";

interface Props {
  state: "idle" | "correct" | "incorrect" | "reveal" | "hint";
  message?: string;
  correctAnswer?: string;
  hint?: string | null;
}

export function FeedbackBubble({
  state,
  message,
  correctAnswer,
  hint,
}: Props) {
  return (
    <div className="mx-auto mt-4 flex min-h-20 max-w-md items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {state === "correct" && (
          <motion.div
            key="correct"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-full bg-emerald-100 px-6 py-3 text-emerald-700 text-xl font-semibold"
          >
            🌟 Nice! {message ?? "You got it."}
          </motion.div>
        )}
        {state === "hint" && hint && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-amber-50 px-5 py-3 text-amber-800 text-lg text-center font-medium"
          >
            <span className="mr-1">💡</span>
            {hint}
          </motion.div>
        )}
        {state === "incorrect" && (
          <motion.div
            key="wrong"
            initial={{ x: -6 }}
            animate={{ x: [6, -6, 6, 0] }}
            exit={{ opacity: 0 }}
            className="rounded-full bg-amber-100 px-6 py-3 text-amber-700 text-xl font-semibold"
          >
            Almost — try again.
          </motion.div>
        )}
        {state === "reveal" && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-sky-100 px-6 py-3 text-sky-800 text-lg text-center font-semibold"
          >
            The answer is <strong className="text-2xl">{correctAnswer}</strong>.
            <span className="ml-1 font-normal">We'll see it again soon.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
