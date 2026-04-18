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
and English spelling. You receive a kid's level, weak skill tags, due items,
requested subject mix, and duration budget.

RULES:
1. Always respond by calling the "emit_session" tool with structured input.
2. Types:
   - "math_arith": prompt is a math expression like "12 + 7"; expected is the numeric answer as a string.
   - "spelling_audio": prompt is a single target word; sentence is a short kid-friendly sentence using it.
   - "spelling_visual": prompt is a single target word; imageHint is 2-4 words describing a clipart.
3. Never include proper nouns, violent imagery, or topics outside school math/spelling.
4. Interleave types when the subjectMix is balanced. Prioritize weak/due skills.
5. Each problem gets a 1-3 step hintLadder, increasingly concrete.
6. Never repeat the same prompt. Keep 10-15 problems total, 20 max.
7. Short strings only: prompts <= 30 chars, sentences <= 60 chars, hints <= 80 chars.

Known skill taxonomy (tag -> short description):
${[...MATH_SKILLS, ...SPELLING_SKILLS]
  .map((s) => `- ${s.tag}: ${s.name} (difficulty ${s.difficulty})`)
  .join("\n")}
`.trim();

const EMIT_SESSION_TOOL = {
  name: "emit_session",
  description: "Emit the final practice session as structured data.",
  input_schema: {
    type: "object" as const,
    properties: {
      problems: {
        type: "array",
        minItems: 1,
        maxItems: 20,
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: {
              type: "string",
              enum: ["math_arith", "spelling_audio", "spelling_visual"],
            },
            skillTag: { type: "string" },
            prompt: { type: "string" },
            expected: { type: "string" },
            sentence: { type: "string" },
            imageHint: { type: "string" },
            hintLadder: {
              type: "array",
              items: { type: "string" },
              maxItems: 3,
            },
          },
          required: ["id", "type", "skillTag", "prompt", "expected", "hintLadder"],
        },
      },
    },
    required: ["problems"],
  },
};

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
    max_tokens: 4096,
    system: cachedSystemBlocks(SYSTEM_PROMPT),
    tools: [EMIT_SESSION_TOOL],
    tool_choice: { type: "tool", name: "emit_session" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Generate a practice session for this child by calling emit_session.\n\n" +
              userMessage,
          },
        ],
      },
    ],
  });

  const toolUse = resp.content.find(
    (c): c is Extract<typeof c, { type: "tool_use" }> => c.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Model did not call emit_session");
  }
  const parsed = GeneratedSession.parse(toolUse.input);

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
