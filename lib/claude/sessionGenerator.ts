import type Anthropic from "@anthropic-ai/sdk";
import { cachedSystemBlocks, getAnthropic, MODEL_FAST } from "./client";
import { GeneratedSession, type GeneratedProblem } from "./schemas";
import { MATH_SKILLS } from "../curriculum/math.seed";
import { SPELLING_SKILLS } from "../curriculum/spelling.seed";

/**
 * Long, cacheable system prompt. Keep this STATIC across requests so the
 * prompt cache hits.
 */
const SYSTEM_PROMPT = `
You design short practice sessions for children aged 6-10, focused on math
and English spelling. You are given a kid's current level, weak skill tags,
a list of items due for review, requested subject mix, and duration budget.

RULES (must follow exactly):
1. Output STRICT JSON matching the schema: { "problems": [...] }.
2. Each problem has: id, type, skillTag, prompt, expected, hintLadder.
3. Types:
   - "math_arith": prompt is a math expression like "12 + 7"; expected is the numeric answer as a string.
   - "spelling_audio": prompt is the single word the child must spell; include a short kid-friendly sentence using it.
   - "spelling_visual": prompt is the single word the child must spell; include an imageHint (2-4 words) usable to pick a clipart icon.
4. Use friendly, age-appropriate language. Never include proper nouns, violent imagery, or topics outside school math/spelling.
5. Interleave types when the subjectMix is balanced. If a skill is marked weak or due, include items for that skill first.
6. Each problem must have a 1-3 step hintLadder, increasingly concrete.
7. Do not repeat the same prompt twice in one session.
8. Limit total problems to what fits the duration at ~30 seconds per item.

Known skill taxonomy (tag -> short description):
${[...MATH_SKILLS, ...SPELLING_SKILLS]
  .map((s) => `- ${s.tag}: ${s.name} (difficulty ${s.difficulty})`)
  .join("\n")}
`.trim();

export interface SessionGenInput {
  kid: { age: number; displayName: string };
  levels: { math: number; spelling: number };
  weakSkillTags: string[];
  dueItems: Array<{ itemId: string; skillTag: string; prompt: string; expected: string }>;
  subjectMix: { math: number; spelling: number };
  durationS: number;
  interleave: boolean;
}

export interface SessionGenResult {
  problems: GeneratedProblem[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
  };
}

export async function generateSession(
  input: SessionGenInput
): Promise<SessionGenResult> {
  const client = getAnthropic();
  const userMessage = JSON.stringify(input, null, 2);

  const resp = await client.messages.create({
    model: MODEL_FAST,
    max_tokens: 2048,
    system: cachedSystemBlocks(SYSTEM_PROMPT),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Generate a practice session for this child. Respond with JSON only.\n\n" +
              userMessage,
          },
        ],
      },
    ],
  });

  const text = resp.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();

  const json = extractJson(text);
  const parsed = GeneratedSession.parse(json);

  return {
    problems: parsed.problems,
    usage: {
      inputTokens: resp.usage.input_tokens,
      outputTokens: resp.usage.output_tokens,
      cacheReadInputTokens:
        (resp.usage as unknown as { cache_read_input_tokens?: number })
          .cache_read_input_tokens,
    },
  };
}

// Claude occasionally wraps JSON in prose. Extract the first {...} block.
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}
