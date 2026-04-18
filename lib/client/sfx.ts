"use client";

/**
 * Tiny, disposable Web Audio tones so kids get instant feedback on
 * every tap without needing us to ship audio files. Designed to be
 * gentle — no harsh squeals on wrong answers.
 *
 * All helpers bail quietly if AudioContext isn't available (old
 * browsers, SSR).
 */

let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    (window as unknown as { AudioContext?: typeof AudioContext })
      .AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!_ctx) _ctx = new AC();
  // Some browsers suspend the context until a user gesture — try to
  // resume each time; no-op if already running.
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
}

function tone(freq: number, durationMs: number, startOffsetMs = 0) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + startOffsetMs / 1000;
  const t1 = t0 + durationMs / 1000;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0, t0);
  gain.gain.linearRampToValueAtTime(0.15, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t1);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t1);
}

/** Two quick ascending notes. */
export function chimeCorrect() {
  tone(660, 140, 0);
  tone(880, 180, 120);
}

/** One soft low note — gentle, not punitive. */
export function chimeIncorrect() {
  tone(320, 180, 0);
}

/** Warm triad on session completion. */
export function chimeComplete() {
  tone(523, 220, 0);
  tone(659, 220, 140);
  tone(784, 340, 280);
}
