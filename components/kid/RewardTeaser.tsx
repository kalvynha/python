"use client";

interface Reward {
  id: string;
  title: string;
  emoji: string;
  costStars: number;
}

interface Props {
  availableStars: number;
  rewards: Reward[];
  /** "greeting" = single motivating line; "summary" = full list. */
  variant?: "greeting" | "summary";
}

/**
 * Shows what the kid can (and almost can) cash in their stars for.
 * Two variants:
 *  - "greeting": one short line under the session intro, pointing at
 *    the nearest reward within reach or the cheapest next one.
 *  - "summary": grid of affordable rewards + a "next up" card when
 *    the next unaffordable reward is close.
 */
export function RewardTeaser({
  availableStars,
  rewards,
  variant = "summary",
}: Props) {
  if (rewards.length === 0) return null;

  const affordable = rewards.filter((r) => availableStars >= r.costStars);
  const next = rewards.find((r) => r.costStars > availableStars);

  if (variant === "greeting") {
    if (affordable.length > 0) {
      const top = affordable[0];
      return (
        <p className="mt-3 inline-block rounded-full bg-amber-100 px-4 py-1.5 text-base font-semibold text-amber-800">
          ⭐ You can request {top.emoji} {top.title}!
        </p>
      );
    }
    if (next) {
      const need = next.costStars - availableStars;
      return (
        <p className="mt-3 inline-block rounded-full bg-sky-100 px-4 py-1.5 text-base font-semibold text-sky-800">
          {need} more ⭐ for {next.emoji} {next.title}
        </p>
      );
    }
    return null;
  }

  return (
    <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
        Rewards you&apos;ve earned
      </h3>
      {affordable.length === 0 ? (
        <p className="mt-2 text-slate-500">
          Keep practicing — the next reward is getting closer!
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {affordable.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3"
            >
              <div className="text-3xl">{r.emoji}</div>
              <div className="flex-1 text-left">
                <div className="font-semibold">{r.title}</div>
                <div className="text-xs text-emerald-700">
                  ⭐ {r.costStars} · ready to request
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {next && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-sky-200 p-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl opacity-60">{next.emoji}</div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-slate-700">
                {next.title}
              </div>
              <div className="text-xs text-slate-500">
                {next.costStars - availableStars} more ⭐ to unlock
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
