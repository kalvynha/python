"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  word: string;
  sentence?: string;
  onAnswer: (given: string) => void;
  disabled?: boolean;
}

/**
 * Uses the browser's Web Speech API (SpeechSynthesis). It's free and
 * available in every modern browser. We pick a child-friendly voice if
 * available; otherwise fall back to default. Auto-plays once on mount.
 */
export function SpellingAudio({ word, sentence, onAnswer, disabled }: Props) {
  const [entry, setEntry] = useState("");

  useEffect(() => {
    speak(word);
    // Re-speak when the word changes (new question)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md text-center"
    >
      <div className="rounded-3xl bg-white p-8 shadow-md">
        <p className="text-slate-500 text-lg">Listen and spell the word</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => speak(word)}
            className="btn-primary text-3xl h-20 w-20 rounded-full"
            aria-label="Play the word"
          >
            🔊
          </button>
          {sentence && (
            <button
              type="button"
              onClick={() => speak(sentence)}
              className="text-sky-600 underline underline-offset-4"
            >
              Hear it in a sentence
            </button>
          )}
        </div>
        <input
          type="text"
          value={entry}
          onChange={(e) => setEntry(e.target.value.toLowerCase())}
          className="mt-8 w-full rounded-2xl border-2 border-slate-200 px-4 py-4 text-3xl text-center tracking-widest focus:border-sky-400 focus:outline-none"
          placeholder="type here"
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

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85;
  u.pitch = 1.1;
  // Prefer an en-US voice
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.lang.startsWith("en") && /child|kid|samantha|google/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith("en"));
  if (preferred) u.voice = preferred;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
