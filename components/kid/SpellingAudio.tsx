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
  u.rate = 0.8;
  u.pitch = 1.05;
  u.voice = pickBestVoice();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/**
 * Pick the most natural-sounding English voice available in the
 * browser. Voice availability varies by OS/browser — this priority
 * list prefers premium/neural voices where possible and falls back
 * gracefully.
 */
function pickBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const enVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  if (enVoices.length === 0) return voices[0];

  // Priority order — roughly best-to-worst by perceived naturalness
  // across Chrome, Safari, Edge, Firefox on macOS / Windows / Android / iOS.
  const preferences: Array<(v: SpeechSynthesisVoice) => boolean> = [
    // Apple premium/enhanced (macOS 14+ / iOS 17+)
    (v) => /\(premium\)/i.test(v.name),
    (v) => /\(enhanced\)/i.test(v.name),
    (v) => /ava|evan|zoe/i.test(v.name) && /apple|siri/i.test(v.name),
    // Apple Siri voices (iOS/macOS)
    (v) => /siri/i.test(v.name),
    // Google / Android
    (v) => /google us english/i.test(v.name),
    (v) => /google uk english female/i.test(v.name),
    (v) => /google/i.test(v.name) && !/male/i.test(v.name),
    // Microsoft neural voices (Windows 11, Edge)
    (v) => /aria|jenny|natasha|libby/i.test(v.name) && /microsoft/i.test(v.name),
    (v) => /natural|neural/i.test(v.name),
    // Decent legacy macOS voices
    (v) => /samantha|allison|ava|susan/i.test(v.name),
    // Any English voice as last resort
    (v) => v.lang.toLowerCase().startsWith("en-us"),
    (v) => v.lang.toLowerCase().startsWith("en"),
  ];

  for (const test of preferences) {
    const match = enVoices.find(test);
    if (match) return match;
  }
  return enVoices[0];
}
