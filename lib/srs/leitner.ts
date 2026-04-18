/**
 * Leitner-box spaced repetition.
 *
 * 5 boxes, each with a review interval. Correct → promote (up to box 5).
 * Incorrect → demote to box 1. A "streak" counts consecutive correct
 * answers; mastery is streak ≥ MASTERY_STREAK combined with being in
 * box ≥ 4 — prevents false positives inside the same session.
 */

export const BOX_INTERVALS_DAYS = [0, 1, 2, 4, 7, 14]; // 1-indexed; box 0 unused
export const MAX_BOX = 5 as const;
export const MIN_BOX = 1 as const;
export const MASTERY_STREAK = 3;

export interface ReviewState {
  itemId: string;
  box: number; // 1..5
  dueAt: number; // epoch ms
  streak: number; // consecutive correct
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fresh item starts in box 1, due now. */
export function initReview(itemId: string, now: number): ReviewState {
  return { itemId, box: MIN_BOX, dueAt: now, streak: 0 };
}

/** Apply an attempt outcome and compute the next review state. */
export function applyAttempt(
  state: ReviewState,
  correct: boolean,
  now: number
): ReviewState {
  if (correct) {
    const nextBox = Math.min(state.box + 1, MAX_BOX);
    const intervalDays = BOX_INTERVALS_DAYS[nextBox];
    return {
      itemId: state.itemId,
      box: nextBox,
      dueAt: now + intervalDays * DAY_MS,
      streak: state.streak + 1,
    };
  }
  // Demote to box 1; due again soon (today).
  return {
    itemId: state.itemId,
    box: MIN_BOX,
    dueAt: now + BOX_INTERVALS_DAYS[MIN_BOX] * DAY_MS,
    streak: 0,
  };
}

export function isDue(state: ReviewState, now: number): boolean {
  return state.dueAt <= now;
}

export function isMastered(state: ReviewState): boolean {
  return state.box >= 4 && state.streak >= MASTERY_STREAK;
}
