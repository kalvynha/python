"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { authedFetch } from "@/lib/client/authedFetch";

interface Props {
  word: string;
  imageHint?: string;
  emoji?: string;
  sentence?: string;
  onAnswer: (given: string) => void;
  disabled?: boolean;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85;
  u.pitch = 1.1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/**
 * Visual spelling prompt. Tries Pixabay (via /api/images/lookup, which
 * caches in Firestore) first; falls back to Claude-picked emoji; last
 * resort is a letter placeholder.
 */
export function SpellingVisual({
  word,
  imageHint,
  emoji,
  sentence,
  onAnswer,
  disabled,
}: Props) {
  const [entry, setEntry] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgState, setImgState] = useState<"loading" | "ready" | "missing">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    setImgState("loading");
    setImgUrl(null);

    const query = (imageHint ?? word).toLowerCase();
    (async () => {
      try {
        const res = await authedFetch(
          `/api/images/lookup?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error("lookup_failed");
        const data = (await res.json()) as { url: string | null };
        if (cancelled) return;
        if (data.url) {
          setImgUrl(data.url);
          setImgState("ready");
        } else {
          setImgState("missing");
        }
      } catch {
        if (!cancelled) setImgState("missing");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [word, imageHint]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md text-center"
    >
      <div className="rounded-3xl bg-white p-8 shadow-md">
        <p className="text-slate-500 text-lg">What is this?</p>
        <div className="mt-4 flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-sky-50 text-7xl">
          {imgState === "ready" && imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          ) : imgState === "loading" ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
          ) : emoji ? (
            <span>{emoji}</span>
          ) : (
            // No image and no emoji — offer audio so the kid has a cue.
            <button
              type="button"
              onClick={() => speak(sentence ?? word)}
              className="flex flex-col items-center gap-1 text-sky-600"
              aria-label="Play the word"
            >
              <span className="text-5xl">🔊</span>
              <span className="text-sm">Tap to hear</span>
            </button>
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
