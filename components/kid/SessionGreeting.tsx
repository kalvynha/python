"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { fetchTTSSSML, speakFallback } from "@/lib/client/tts";
import { RewardTeaser } from "./RewardTeaser";

interface Reward {
  id: string;
  title: string;
  emoji: string;
  costStars: number;
}

interface Props {
  name: string;
  availableStars?: number;
  rewards?: Reward[];
  onDone: () => void;
}

/**
 * Kid-facing intro splash at the very start of a session. Plays a
 * Miss-Rachel-style personalized greeting and shows a big "Let's go!"
 * button so the kid can dismiss it themselves (which doubles as the
 * user gesture that unblocks audio playback on iOS for the rest of
 * the session).
 */
export function SessionGreeting({
  name,
  availableStars = 0,
  rewards = [],
  onDone,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Pick a greeting template once so it's stable within the splash.
  const [line] = useState(() => pickGreeting(name));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ssml = buildSSML(line.ssml, name);
      const url = await fetchTTSSSML(ssml);
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      urlRef.current = url;
      await play();
    })();
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = async () => {
    setPlaying(true);
    if (!urlRef.current) {
      speakFallback(line.spoken.replace(/\{name\}/g, name));
      setPlaying(false);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = urlRef.current;
    audioRef.current.onended = () => setPlaying(false);
    try {
      await audioRef.current.play();
    } catch {
      speakFallback(line.spoken.replace(/\{name\}/g, name));
      setPlaying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto max-w-xl px-6 py-12 text-center"
    >
      <div className="text-7xl sm:text-8xl">👋</div>
      <h1 className="mt-6 text-4xl font-bold text-slate-900 sm:text-5xl">
        {line.display.replace("{name}", name)}
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        {line.subtitle}
      </p>
      {rewards.length > 0 && (
        <div className="mt-3">
          <div className="text-sm text-slate-500">
            You have ⭐ {availableStars} stars
          </div>
          <RewardTeaser
            availableStars={availableStars}
            rewards={rewards}
            variant="greeting"
          />
        </div>
      )}
      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onDone}
          className="btn-primary w-full max-w-xs text-2xl"
          autoFocus
        >
          Let&apos;s go! 🚀
        </button>
        <button
          type="button"
          onClick={play}
          disabled={playing}
          className="text-sky-600 underline underline-offset-4 disabled:opacity-50"
        >
          {playing ? "Speaking…" : "Hear it again"}
        </button>
      </div>
    </motion.div>
  );
}

interface GreetingLine {
  display: string; // shown on screen (can be short)
  subtitle: string; // supporting copy under the heading
  spoken: string; // fallback plain text
  ssml: string; // SSML with pauses / emphasis; {name} replaced at render time
}

/** Pick one greeting template pseudo-randomly. Stable for the splash. */
function pickGreeting(name: string): GreetingLine {
  const firstChar = (name.charCodeAt(0) || 0) + Date.now();
  const idx = Math.abs(firstChar) % GREETINGS.length;
  return GREETINGS[idx];
}

function buildSSML(template: string, name: string): string {
  const safe = escapeSSML(name);
  return `<speak>${template.replace(/\{name\}/g, safe)}</speak>`;
}

function escapeSSML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Miss-Rachel-style SSML: slow rate, bumped pitch, clear breaks,
 * emphasis on the kid's name and the "Let's go!" punchline. These
 * are intentionally varied so repeat sessions feel fresh.
 */
const GREETINGS: GreetingLine[] = [
  {
    display: "Hi, {name}!",
    subtitle: "Ready for today's practice?",
    spoken: "Hi, {name}! Are you ready to practice? Let's go!",
    ssml:
      `<prosody rate="92%" pitch="+2st">` +
      `<emphasis level="strong">Hi, {name}!</emphasis>` +
      `<break time="350ms"/>` +
      `Are you ready to practice?` +
      `<break time="250ms"/>` +
      `<emphasis level="strong">Let's go!</emphasis>` +
      `</prosody>`,
  },
  {
    display: "Hey there, {name}!",
    subtitle: "You're going to rock this.",
    spoken:
      "Hey there, {name}! It's practice time — you've got this!",
    ssml:
      `<prosody rate="92%" pitch="+2st">` +
      `<emphasis level="strong">Hey there, {name}!</emphasis>` +
      `<break time="300ms"/>` +
      `It's practice time — you've got this!` +
      `</prosody>`,
  },
  {
    display: "Woohoo, {name}!",
    subtitle: "Let's learn something new today.",
    spoken: "Woohoo! {name}! Let's learn something new today!",
    ssml:
      `<prosody rate="90%" pitch="+3st">` +
      `<emphasis level="strong">Wooohoooo!</emphasis>` +
      `<break time="200ms"/>` +
      `<emphasis level="strong">{name}!</emphasis>` +
      `<break time="300ms"/>` +
      `Let's learn something new today!` +
      `</prosody>`,
  },
  {
    display: "Hi, friend {name}!",
    subtitle: "Time to make your brain sparkle.",
    spoken:
      "Hi, my friend {name}! Are you ready to make your brain sparkle?",
    ssml:
      `<prosody rate="92%" pitch="+2st">` +
      `<emphasis level="moderate">Hi, my friend {name}!</emphasis>` +
      `<break time="300ms"/>` +
      `Are you ready to make your brain` +
      `<emphasis level="strong">sparkle?</emphasis>` +
      `</prosody>`,
  },
  {
    display: "Hi-yaa, {name}!",
    subtitle: "Show me what you've got!",
    spoken: "Hi-yaa, {name}! Let's show 'em what you've got!",
    ssml:
      `<prosody rate="92%" pitch="+2st">` +
      `<emphasis level="strong">Hi-yaaa, {name}!</emphasis>` +
      `<break time="280ms"/>` +
      `Let's show 'em what you've got!` +
      `</prosody>`,
  },
];
