"use client";

import { AnimatePresence, motion } from "framer-motion";

interface Props {
  state: "idle" | "correct" | "incorrect" | "reveal" | "hint";
  message?: string;
  correctAnswer?: string;
  hint?: string | null;
}

/**
 * Renders as a fixed-position overlay just below the NavBar so hints
 * and the revealed answer are always visible without pushing the
 * numpad or problem card off the screen. The container is
 * pointer-events: none so it never blocks taps on the numpad.
 */
export function FeedbackBubble({
  state,
  message,
  correctAnswer,
  hint,
}: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center px-3 sm:top-20">
      <AnimatePresence mode="wait">
        {state === "correct" && (
          <motion.div
            key="correct"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto max-w-md rounded-full bg-emerald-100 px-5 py-2.5 text-emerald-700 text-lg font-semibold shadow-lg"
          >
            🌟 Nice! {message ?? "You got it."}
          </motion.div>
        )}
        {state === "hint" && hint && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto max-w-md rounded-2xl bg-amber-50/95 px-4 py-2.5 text-amber-800 text-base text-center font-medium shadow-lg backdrop-blur"
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
            className="pointer-events-auto max-w-md rounded-full bg-amber-100 px-5 py-2.5 text-amber-700 text-lg font-semibold shadow-lg"
          >
            Almost — try again.
          </motion.div>
        )}
        {state === "reveal" && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto max-w-md rounded-2xl bg-sky-100/95 px-5 py-3 text-sky-800 text-base text-center font-semibold shadow-lg backdrop-blur"
          >
            The answer is{" "}
            <strong className="text-xl">{correctAnswer}</strong>.
            <span className="ml-1 font-normal">We'll see it again soon.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
