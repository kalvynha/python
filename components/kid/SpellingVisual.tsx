"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  word: string;
  imageHint?: string;
  emoji?: string;
  onAnswer: (given: string) => void;
  disabled?: boolean;
}

// Minimal emoji fallback for an imageHint → picture. For MVP we match
// a few common hints; otherwise show the first letter in a big circle.
const EMOJI_MAP: Record<string, string> = {
  cat: "🐱",
  dog: "🐶",
  pig: "🐷",
  fish: "🐟",
  star: "⭐",
  tree: "🌳",
  sun: "☀️",
  moon: "🌙",
  cake: "🍰",
  bike: "🚲",
  car: "🚗",
  home: "🏠",
  ship: "🚢",
  rope: "🪢",
  bone: "🦴",
  corn: "🌽",
  nut: "🌰",
  egg: "🥚",
  hat: "🎩",
  bag: "👜",
};

export function SpellingVisual({
  word,
  imageHint,
  emoji,
  onAnswer,
  disabled,
}: Props) {
  const [entry, setEntry] = useState("");
  const shown =
    emoji ?? EMOJI_MAP[(imageHint ?? word).toLowerCase()] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md text-center"
    >
      <div className="rounded-3xl bg-white p-8 shadow-md">
        <p className="text-slate-500 text-lg">What is this?</p>
        <div className="mt-4 flex h-40 items-center justify-center rounded-2xl bg-sky-50 text-7xl">
          {shown ?? (
            <span className="text-slate-300 text-5xl font-bold">
              {word[0].toUpperCase()}?
            </span>
          )}
        </div>
        <input
          type="text"
          value={entry}
          onChange={(e) => setEntry(e.target.value.toLowerCase())}
          className="mt-8 w-full rounded-2xl border-2 border-slate-200 px-4 py-4 text-3xl text-center tracking-widest focus:border-sky-400 focus:outline-none"
          placeholder="spell it"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && entry) {
              onAnswer(entry.trim());
              setEntry("");
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!entry) return;
            onAnswer(entry.trim());
            setEntry("");
          }}
          className="btn-primary mt-6 w-full"
          disabled={disabled || !entry}
        >
          Check
        </button>
      </div>
    </motion.div>
  );
}
