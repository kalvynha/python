"use client";

import { authedFetch } from "./authedFetch";

/**
 * Fetch a TTS audio URL (blob) for `text` via /api/tts. Returns null
 * if the fetch fails; callers should handle fallback.
 */
export async function fetchTTS(text: string): Promise<string | null> {
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
 * Same as fetchTTS but sends SSML for fine-grained prosody (breaks,
 * pitch bumps, emphasis). Use for intros/celebrations where the
 * delivery matters more than just "speak this word".
 */
export async function fetchTTSSSML(ssml: string): Promise<string | null> {
  try {
    const res = await authedFetch(`/api/tts?s=${encodeURIComponent(ssml)}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/** Convert math symbols to spoken words so TTS sounds natural. */
export function expressionToWords(expr: string): string {
  return expr
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/−/g, " minus ")
    .replace(/-/g, " minus ")
    .replace(/\+/g, " plus ")
    .replace(/=/g, " equals ")
    .replace(/\//g, " divided by ")
    .replace(/\*/g, " times ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fallback voice using the browser's speech synthesis. Used only when
 * /api/tts fails. The voice picker prefers the most natural engine
 * present on the device.
 */
export function speakFallback(text: string) {
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
