"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { fetchTTS, speakFallback } from "@/lib/client/tts";

interface Props {
  word: string;
  sentence?: string;
  onAnswer: (given: string) => void;
  disabled?: boolean;
}

/**
 * Spelling prompt: plays the target word (and optional sentence) aloud
 * and lets the kid type it. Primary voice comes from the server-side
 * Google Cloud TTS at /api/tts. Falls back to browser Web Speech API.
 *
 * iOS blocks autoplay until a user gesture. On the very first mount
 * we attempt autoplay; if it's rejected we stay in a "tap to hear"
 * state so the kid can trigger playback themselves.
 */
export function SpellingAudio({ word, sentence, onAnswer, disabled }: Props) {
  const [entry, setEntry] = useState("");
  const [wordLoading, setWordLoading] = useState(false);
  const [sentenceLoading, setSentenceLoading] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const wordUrlRef = useRef<string | null>(null);
  const sentenceUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    revokeBlobs();
    wordUrlRef.current = null;
    sentenceUrlRef.current = null;

    (async () => {
      setWordLoading(true);
      const url = await fetchTTS(word);
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      wordUrlRef.current = url;
      setWordLoading(false);
      // Best-effort autoplay; if blocked, flip into tap-to-hear mode.
      const ok = await playThrough(url, word);
      if (!ok) setNeedsTap(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  useEffect(() => () => revokeBlobs(), []);

  const revokeBlobs = () => {
    if (wordUrlRef.current) URL.revokeObjectURL(wordUrlRef.current);
    if (sentenceUrlRef.current) URL.revokeObjectURL(sentenceUrlRef.current);
  };

  const playWord = async () => {
    setNeedsTap(false);
    if (wordUrlRef.current) {
      await playThrough(wordUrlRef.current, word);
      return;
    }
    setWordLoading(true);
    const url = await fetchTTS(word);
    wordUrlRef.current = url;
    setWordLoading(false);
    await playThrough(url, word);
  };

  const playSentence = async () => {
    if (!sentence) return;
    if (sentenceUrlRef.current) {
      await playThrough(sentenceUrlRef.current, sentence);
      return;
    }
    setSentenceLoading(true);
    const url = await fetchTTS(sentence);
    sentenceUrlRef.current = url;
    setSentenceLoading(false);
    await playThrough(url, sentence);
  };

  const playThrough = async (
    url: string | null,
    fallbackText: string
  ): Promise<boolean> => {
    if (!url) {
      speakFallback(fallbackText);
      return true;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    try {
      await audioRef.current.play();
      return true;
    } catch {
      speakFallback(fallbackText);
      return false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md text-center"
    >
      <div className="rounded-3xl bg-white p-8 shadow-md">
        <p className="text-slate-500 text-lg">
          {needsTap ? "Tap to hear the word" : "Listen and spell the word"}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={playWord}
            disabled={wordLoading}
            className={
              "btn-primary relative h-20 w-20 rounded-full text-3xl disabled:opacity-70 " +
              (needsTap ? "ring-4 ring-sky-300 animate-pulse" : "")
            }
            aria-label="Play the word"
          >
            {wordLoading ? (
              <span className="absolute inset-0 m-auto inline-block h-6 w-6 animate-spin rounded-full border-4 border-white/40 border-t-white" />
            ) : (
              "🔊"
            )}
          </button>
          {sentence && (
            <button
              type="button"
              onClick={playSentence}
              disabled={sentenceLoading}
              className="text-sky-600 underline underline-offset-4 disabled:opacity-60"
            >
              {sentenceLoading ? "Loading…" : "Hear it in a sentence"}
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
