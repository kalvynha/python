/**
 * Roll up a session's attempts into skill-level adjustments.
 *
 * Rules (evidence-based, conservative so kids don't yo-yo):
 *   - Only consider skills with >= MIN_ATTEMPTS attempts this session.
 *   - accuracy >= 0.8  -> level +1 (cap at 10)
 *   - accuracy <= 0.4  -> level -1 (floor at 0)
 *   - otherwise leave unchanged
 *
 * Session stars are derived from overall accuracy across all attempts:
 *   - >= 0.9  -> 3 stars
 *   - >= 0.7  -> 2 stars
 *   - > 0     -> 1 star
 *   - 0       -> 0 stars (no attempts)
 *
 * Streak: compares today's YYYY-MM-DD against lastSessionDay.
 *   - same day  -> unchanged
 *   - yesterday -> +1
 *   - older/absent -> reset to 1
 */

export const MIN_ATTEMPTS_FOR_LEVEL_CHANGE = 3;

export interface AttemptSummary {
  skillTag: string;
  correct: boolean;
}

export interface SkillBucket {
  correct: number;
  total: number;
}

export function bucketBySkill(
  attempts: AttemptSummary[]
): Record<string, SkillBucket> {
  const out: Record<string, SkillBucket> = {};
  for (const a of attempts) {
    out[a.skillTag] ??= { correct: 0, total: 0 };
    out[a.skillTag].total += 1;
    if (a.correct) out[a.skillTag].correct += 1;
  }
  return out;
}

export function proposeLevelDelta(bucket: SkillBucket): -1 | 0 | 1 {
  if (bucket.total < MIN_ATTEMPTS_FOR_LEVEL_CHANGE) return 0;
  const acc = bucket.correct / bucket.total;
  if (acc >= 0.8) return 1;
  if (acc <= 0.4) return -1;
  return 0;
}

export function clampLevel(level: number): number {
  return Math.max(0, Math.min(10, level));
}

export function computeStars(attempts: AttemptSummary[]): number {
  if (attempts.length === 0) return 0;
  const correct = attempts.filter((a) => a.correct).length;
  const acc = correct / attempts.length;
  if (acc >= 0.9) return 3;
  if (acc >= 0.7) return 2;
  if (acc > 0) return 1;
  return 0;
}

/** Local-time YYYY-MM-DD. Using local date avoids UTC edge where a
 * kid practicing at 8pm Pacific sees their streak reset at midnight
 * UTC (5pm Pacific). */
function isoDay(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns YYYY-MM-DD for the day BEFORE the given local date. */
function yesterday(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() - 1);
  return isoDay(dt.getTime());
}

export function computeStreak(
  prevStreak: number,
  prevDay: string | undefined,
  now: number
): { streak: number; lastSessionDay: string } {
  const today = isoDay(now);
  if (!prevDay) return { streak: 1, lastSessionDay: today };
  if (prevDay === today) {
    return {
      streak: prevStreak > 0 ? prevStreak : 1,
      lastSessionDay: today,
    };
  }
  if (prevDay === yesterday(today)) {
    return { streak: prevStreak + 1, lastSessionDay: today };
  }
  return { streak: 1, lastSessionDay: today };
}
