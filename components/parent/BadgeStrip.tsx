"use client";

import type { BadgeTier } from "@/lib/srs/badges";

interface Badge {
  skillTag: string;
  tier: BadgeTier;
  level: number;
  earnedAt: number;
}

interface SkillName {
  tag: string;
  name: string;
  domain: "math" | "spelling";
}

interface Props {
  badges: Badge[];
  skills: SkillName[];
}

const TIER_EMOJI: Record<BadgeTier, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
};

const TIERS: BadgeTier[] = ["bronze", "silver", "gold"];

/**
 * Group earned badges by skill, showing earned tiers in color and
 * next tiers as dimmed placeholders so parents (and kids) can see
 * the progression path.
 */
export function BadgeStrip({ badges, skills }: Props) {
  // skills the kid has earned at least one tier in — sort those first.
  const bySkill = new Map<string, Map<BadgeTier, Badge>>();
  for (const b of badges) {
    if (!bySkill.has(b.skillTag)) bySkill.set(b.skillTag, new Map());
    bySkill.get(b.skillTag)!.set(b.tier, b);
  }

  const earnedSkills = skills.filter((s) => bySkill.has(s.tag));

  if (earnedSkills.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No badges yet. Keep practicing — bronze arrives at level 3.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {(["math", "spelling"] as const).map((domain) => {
        const domainSkills = earnedSkills.filter((s) => s.domain === domain);
        if (domainSkills.length === 0) return null;
        return (
          <div key={domain}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {domain}
            </h4>
            <ul className="mt-2 space-y-2">
              {domainSkills.map((s) => {
                const tiers = bySkill.get(s.tag);
                return (
                  <li
                    key={s.tag}
                    className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"
                  >
                    <span className="text-sm text-slate-700">{s.name}</span>
                    <span className="flex items-center gap-1 text-2xl">
                      {TIERS.map((tier) => {
                        const earned = tiers?.has(tier);
                        return (
                          <span
                            key={tier}
                            title={
                              earned
                                ? `${tier} earned ${new Date(
                                    tiers!.get(tier)!.earnedAt
                                  ).toLocaleDateString()}`
                                : `${tier} not yet earned`
                            }
                            className={earned ? "" : "grayscale opacity-25"}
                          >
                            {TIER_EMOJI[tier]}
                          </span>
                        );
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
