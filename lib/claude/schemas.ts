import { z } from "zod";

export const GeneratedProblem = z.object({
  id: z.string(),
  type: z.enum(["math_arith", "spelling_audio"]),
  skillTag: z.string(),
  prompt: z.string(),
  expected: z.string(),
  sentence: z.string().optional(),
  hintLadder: z.array(z.string()).max(3),
});
export type GeneratedProblem = z.infer<typeof GeneratedProblem>;

export const GeneratedSession = z.object({
  problems: z.array(GeneratedProblem).min(1).max(40),
});
export type GeneratedSession = z.infer<typeof GeneratedSession>;

export const FeedbackResult = z.object({
  parentSummary: z.string().min(1).max(1500),
  focusSkills: z.array(z.string()).max(6),
});
export type FeedbackResult = z.infer<typeof FeedbackResult>;
