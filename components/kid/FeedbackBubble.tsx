"use client";

import { AnimatePresence, motion } from "framer-motion";

interface Props {
  state: "idle" | "correct" | "incorrect" | "reveal";
  message?: string;
  correctAnswer?: string;
}

export function FeedbackBubble({ state, message, correctAnswer }: Props) {
  return (
    <div className="mx-auto mt-4 flex h-16 max-w-md items-center justify-center">
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
            className="rounded-full bg-sky-100 px-6 py-3 text-sky-700 text-xl font-semibold"
          >
            The answer is <strong>{correctAnswer}</strong>. We'll see it
            again soon.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
