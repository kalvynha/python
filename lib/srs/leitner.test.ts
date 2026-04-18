import { describe, it, expect } from "vitest";
import {
  applyAttempt,
  BOX_INTERVALS_DAYS,
  initReview,
  isDue,
  isMastered,
  MAX_BOX,
  MIN_BOX,
} from "./leitner";

const DAY = 24 * 60 * 60 * 1000;

describe("leitner SRS", () => {
  it("initializes new items in box 1 due now", () => {
    const s = initReview("i1", 1000);
    expect(s.box).toBe(MIN_BOX);
    expect(s.dueAt).toBe(1000);
    expect(s.streak).toBe(0);
  });

  it("promotes on correct and schedules by box interval", () => {
    let s = initReview("i1", 0);
    s = applyAttempt(s, true, 0);
    expect(s.box).toBe(2);
    expect(s.dueAt).toBe(BOX_INTERVALS_DAYS[2] * DAY);
    expect(s.streak).toBe(1);
  });

  it("caps promotion at MAX_BOX", () => {
    let s = initReview("i1", 0);
    for (let i = 0; i < 10; i++) s = applyAttempt(s, true, 0);
    expect(s.box).toBe(MAX_BOX);
  });

  it("demotes to box 1 and resets streak on incorrect", () => {
    let s = initReview("i1", 0);
    s = applyAttempt(s, true, 0);
    s = applyAttempt(s, true, 0);
    expect(s.streak).toBe(2);
    s = applyAttempt(s, false, 100);
    expect(s.box).toBe(MIN_BOX);
    expect(s.streak).toBe(0);
    expect(s.dueAt).toBe(100 + BOX_INTERVALS_DAYS[MIN_BOX] * DAY);
  });

  it("isDue true when now ≥ dueAt", () => {
    const s = { itemId: "x", box: 2, dueAt: 500, streak: 0 };
    expect(isDue(s, 499)).toBe(false);
    expect(isDue(s, 500)).toBe(true);
    expect(isDue(s, 1000)).toBe(true);
  });

  it("mastery requires box ≥ 4 AND streak ≥ 3", () => {
    expect(isMastered({ itemId: "x", box: 3, dueAt: 0, streak: 5 })).toBe(false);
    expect(isMastered({ itemId: "x", box: 4, dueAt: 0, streak: 2 })).toBe(false);
    expect(isMastered({ itemId: "x", box: 4, dueAt: 0, streak: 3 })).toBe(true);
    expect(isMastered({ itemId: "x", box: 5, dueAt: 0, streak: 3 })).toBe(true);
  });
});
