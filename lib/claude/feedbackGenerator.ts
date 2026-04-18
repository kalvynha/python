import type Anthropic from "@anthropic-ai/sdk";
import { cachedSystemBlocks, getAnthropic, MODEL_SMART } from "./client";
import { FeedbackResult } from "./schemas";

const SYSTEM_PROMPT = `
You write kind, specific, evidence-based feedback on a child's short
math/spelling practice session.

OUTPUT: strict JSON with fields:
- kidSummary: 1-3 sentences, warm and encouraging, aimed at a 6-10 year old.
  Celebrate one specific win. Suggest one skill to focus on next, in simple
  words. No shaming, no generic praise like "great job!".
- parentSummary: 3-6 sentences for a parent. Identify patterns across
  attempts (e.g. "mixes 'ie' vs 'ei'", "slower on regrouping across zeros",
  "confident on short vowels"). Reference concrete skill tags. Suggest 1-2
  targeted next steps.
- focusSkills: 1-4 skill tags the child should practice next, drawn only
  from the tags appearing in the provided attempts.

Tone: concise, specific, evidence-first, never judgmental.
`.trim();

export interface FeedbackInput {
  kid: { displayName: string; age: number };
  attempts: Array<{
    skillTag: string;
    prompt: string;
    expected: string;
    given: string;
    correct: boolean;
    timeMs: number;
    hintUsed: boolean;
  }>;
}

export interface FeedbackGenResult {
  kidSummary: string;
  parentSummary: string;
  focusSkills: string[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
  };
}

export async function generateFeedback(
  input: FeedbackInput
): Promise<FeedbackGenResult> {
  const client = getAnthropic();

  const resp = await client.messages.create({
    model: MODEL_SMART,
    max_tokens: 800,
    system: cachedSystemBlocks(SYSTEM_PROMPT),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Write feedback for this session. Respond with JSON only.\n\n" +
              JSON.stringify(input, null, 2),
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

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON in feedback response");
  const parsed = FeedbackResult.parse(JSON.parse(text.slice(start, end + 1)));

  return {
    ...parsed,
    usage: {
      inputTokens: resp.usage.input_tokens,
      outputTokens: resp.usage.output_tokens,
      cacheReadInputTokens:
        (resp.usage as unknown as { cache_read_input_tokens?: number })
          .cache_read_input_tokens,
    },
  };
}
