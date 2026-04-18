import { z } from "zod";

export const SubjectMix = z.object({
  math: z.number().min(0).max(1),
  spelling: z.number().min(0).max(1),
});
export type SubjectMix = z.infer<typeof SubjectMix>;

export const KidDoc = z.object({
  id: z.string(),
  displayName: z.string().min(1).max(40),
  avatar: z.string(), // emoji or preset key
  age: z.number().int().min(4).max(12),
  subjectMix: SubjectMix.default({ math: 0.5, spelling: 0.5 }),
  sessionDurationS: z.number().int().min(120).max(1800).default(600),
  interleave: z.boolean().default(true),
  pinHash: z.string().optional(),
  createdAt: z.number(),
  // Baseline assessment state: until `baselined` is true, /profiles sends
  // the kid through /baseline before they can start a normal session.
  baselined: z.boolean().default(false),
  // Motivation state, maintained by the feedback route at session end.
  currentStreak: z.number().int().nonnegative().default(0),
  lastSessionDay: z.string().optional(), // ISO date YYYY-MM-DD
  totalStars: z.number().int().nonnegative().default(0),
});
export type KidDoc = z.infer<typeof KidDoc>;

export const SkillLevelDoc = z.object({
  skillTag: z.string(),
  level: z.number().int().min(0).max(10),
  lastAssessedAt: z.number(),
});
export type SkillLevelDoc = z.infer<typeof SkillLevelDoc>;

export const ReviewQueueDoc = z.object({
  itemId: z.string(),
  box: z.number().int().min(1).max(5),
  dueAt: z.number(),
  streak: z.number().int().min(0),
});
export type ReviewQueueDoc = z.infer<typeof ReviewQueueDoc>;

export const ItemType = z.enum(["math_arith", "spelling_audio"]);
export type ItemType = z.infer<typeof ItemType>;

export const ItemDoc = z.object({
  id: z.string(),
  type: ItemType,
  skillTag: z.string(),
  difficulty: z.number().int().min(0).max(10),
  // math: "12+7"; spelling: the target word
  prompt: z.string(),
  // for math: numeric string; for spelling: canonical word
  expected: z.string(),
  // optional supporting content
  sentence: z.string().optional(), // for spelling_audio "use in sentence"
  hintLadder: z.array(z.string()).default([]),
});
export type ItemDoc = z.infer<typeof ItemDoc>;

export const AttemptDoc = z.object({
  id: z.string(),
  itemId: z.string(),
  skillTag: z.string(),
  prompt: z.string(),
  expected: z.string(),
  given: z.string(),
  correct: z.boolean(),
  timeMs: z.number().int().nonnegative(),
  hintUsed: z.boolean(),
  at: z.number(),
});
export type AttemptDoc = z.infer<typeof AttemptDoc>;

export const SessionDoc = z.object({
  id: z.string(),
  kidId: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  durationTargetS: z.number().int().positive(),
  subjectMix: SubjectMix,
  itemIdsPlanned: z.array(z.string()),
  summaryState: z.enum(["pending", "ready"]).default("pending"),
});
export type SessionDoc = z.infer<typeof SessionDoc>;

export const FeedbackDoc = z.object({
  kidSummary: z.string(),
  parentSummary: z.string(),
  focusSkills: z.array(z.string()),
  model: z.string(),
  tokenUsage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cacheReadInputTokens: z.number().int().nonnegative().optional(),
  }),
  createdAt: z.number(),
});
export type FeedbackDoc = z.infer<typeof FeedbackDoc>;
