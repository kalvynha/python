"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { authedFetch } from "@/lib/client/authedFetch";

interface Props {
  word: string;
  sentence?: string;
  onAnswer: (given: string) => void;
  disabled?: boolean;
}

/**
 * Spelling prompt: plays the target word (and optional sentence) aloud
 * and lets the kid type it. Primary voice comes from the server-side
 * ElevenLabs TTS at /api/tts. If that fails (offline, quota, no key),
 * falls back to the browser's Web Speech API so the UI still works.
 */
export function SpellingAudio({ word, sentence, onAnswer, disabled }: Props) {
  const [entry, setEntry] = useState("");
  const [wordLoading, setWordLoading] = useState(false);
  const [sentenceLoading, setSentenceLoading] = useState(false);
  const wordUrlRef = useRef<string | null>(null);
  const sentenceUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pre-fetch the word and auto-play it when the question changes.
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
      playThrough(url, word);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  useEffect(() => {
    return () => revokeBlobs();
  }, []);

  const revokeBlobs = () => {
    if (wordUrlRef.current) URL.revokeObjectURL(wordUrlRef.current);
    if (sentenceUrlRef.current) URL.revokeObjectURL(sentenceUrlRef.current);
  };

  const playWord = async () => {
    if (wordUrlRef.current) {
      playThrough(wordUrlRef.current, word);
      return;
    }
    setWordLoading(true);
    const url = await fetchTTS(word);
    wordUrlRef.current = url;
    setWordLoading(false);
    playThrough(url, word);
  };

  const playSentence = async () => {
    if (!sentence) return;
    if (sentenceUrlRef.current) {
      playThrough(sentenceUrlRef.current, sentence);
      return;
    }
    setSentenceLoading(true);
    const url = await fetchTTS(sentence);
    sentenceUrlRef.current = url;
    setSentenceLoading(false);
    playThrough(url, sentence);
  };

  const playThrough = (url: string | null, fallbackText: string) => {
    if (!url) {
      speakFallback(fallbackText);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.play().catch(() => speakFallback(fallbackText));
  };

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
            onClick={playWord}
            disabled={wordLoading}
            className="btn-primary relative h-20 w-20 rounded-full text-3xl disabled:opacity-70"
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

/**
 * Fetch audio for `text` from /api/tts. Returns an object URL the
 * caller can assign to an Audio element, or null if the fetch failed
 * (caller should fall back to Web Speech).
 */
async function fetchTTS(text: string): Promise<string | null> {
  try {
    const res = await authedFetch(
      `/api/tts?q=${encodeURIComponent(text)}`
    );
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Web Speech API fallback — used when the server TTS is unreachable
 * or not configured. Quality varies by OS but it keeps the app usable.
 */
function speakFallback(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.8;
  u.pitch = 1.05;
  u.voice = pickBestVoice();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function pickBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const enVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  if (enVoices.length === 0) return voices[0];

  const preferences: Array<(v: SpeechSynthesisVoice) => boolean> = [
    (v) => /\(premium\)/i.test(v.name),
    (v) => /\(enhanced\)/i.test(v.name),
    (v) => /siri/i.test(v.name),
    (v) => /google us english/i.test(v.name),
    (v) => /google/i.test(v.name) && !/male/i.test(v.name),
    (v) => /aria|jenny|natasha|libby/i.test(v.name) && /microsoft/i.test(v.name),
    (v) => /natural|neural/i.test(v.name),
    (v) => /samantha|allison|ava|susan/i.test(v.name),
    (v) => v.lang.toLowerCase().startsWith("en-us"),
    (v) => v.lang.toLowerCase().startsWith("en"),
  ];
  for (const test of preferences) {
    const match = enVoices.find(test);
    if (match) return match;
  }
  return enVoices[0];
}
