"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Numpad } from "./Numpad";
import { Manipulatives } from "./Manipulatives";
import { expressionToWords, fetchTTS, speakFallback } from "@/lib/client/tts";

interface Props {
  prompt: string; // e.g. "12 + 7"
  onAnswer: (given: string) => void;
  disabled?: boolean;
  /** Show the ten-frame / dot visual for early levels. */
  showManipulatives?: boolean;
}

export function MathProblem({
  prompt,
  onAnswer,
  disabled,
  showManipulatives,
}: Props) {
  const [entry, setEntry] = useState("");
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const submit = () => {
    if (!entry) return;
    onAnswer(entry);
    setEntry("");
  };

  const speak = async () => {
    const text = expressionToWords(prompt);
    if (urlRef.current) {
      play(urlRef.current, text);
      return;
    }
    setLoadingAudio(true);
    const url = await fetchTTS(text);
    setLoadingAudio(false);
    if (url) {
      urlRef.current = url;
      play(url, text);
    } else {
      speakFallback(text);
    }
  };

  const play = (url: string, fallback: string) => {
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.play().catch(() => speakFallback(fallback));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md"
    >
      <div className="rounded-3xl bg-white p-4 text-center shadow-md sm:p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="text-3xl font-bold tabular-nums text-slate-900 sm:text-5xl">
            {prompt} = <span className="text-sky-500">{entry || "?"}</span>
          </div>
          <button
            type="button"
            onClick={speak}
            disabled={loadingAudio || disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-xl hover:bg-sky-200 disabled:opacity-60 sm:h-12 sm:w-12"
            aria-label="Read the problem"
            title="Read the problem"
          >
            {loadingAudio ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-sky-600" />
            ) : (
              "🔊"
            )}
          </button>
        </div>
        {showManipulatives && <Manipulatives prompt={prompt} />}
      </div>
      <div className="mt-6">
        <Numpad
          disabled={disabled}
          onPress={(k) => setEntry((e) => (e.length < 6 ? e + k : e))}
          onBackspace={() => setEntry((e) => e.slice(0, -1))}
          onSubmit={submit}
        />
      </div>
    </motion.div>
  );
}
