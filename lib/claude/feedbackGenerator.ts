import { cachedSystemBlocks, getAnthropic, MODEL_SMART } from "./client";
import { FeedbackResult } from "./schemas";

const SYSTEM_PROMPT = `
You write kind, specific, evidence-based feedback on a child's short
math/spelling practice session. The input includes the child's age —
tune the kidSummary's vocabulary and length to it.

Always respond by calling the "emit_feedback" tool with three fields:

- kidSummary: short, warm, and addressed directly to the child ("you").
  Celebrate one specific thing they did well (name the skill in plain
  words, never the raw tag — say "adding numbers up to 20", not
  "add_within_20"). Gently name one thing to practice next. No shaming,
  no generic praise like "great job!", no emoji beyond one at the end.
  Adapt to age:
    * Age 6-7: 1-2 very short sentences, only common words (1-2
      syllables). Example: "You crushed your 10+ adds! Next time we
      can practice silent e words like cake and home."
    * Age 8-9: 2-3 sentences, simple-but-varied words. May reference
      a pattern, e.g. "You got tricked by words with ie vs ei".
    * Age 10: 2-3 sentences, can use slightly richer vocabulary and
      one metaphor. Still no jargon.

- parentSummary: 3-6 sentences for a parent. Identify patterns across
  attempts (e.g. "mixes 'ie' vs 'ei'", "slower on regrouping across
  zeros", "confident on short vowels"). Reference concrete skill tags.
  Suggest 1-2 targeted next steps.

- focusSkills: 1-4 skill tags the child should practice next, drawn
  only from the tags appearing in the provided attempts.

Tone: concise, specific, evidence-first, never judgmental.
`.trim();

const EMIT_FEEDBACK_TOOL = {
  name: "emit_feedback",
  description: "Emit the structured feedback summary.",
  input_schema: {
    type: "object" as const,
    properties: {
      kidSummary: { type: "string", minLength: 1, maxLength: 500 },
      parentSummary: { type: "string", minLength: 1, maxLength: 1500 },
      focusSkills: {
        type: "array",
        items: { type: "string" },
        maxItems: 6,
      },
    },
    required: ["kidSummary", "parentSummary", "focusSkills"],
  },
};

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
    max_tokens: 1200,
    system: cachedSystemBlocks(SYSTEM_PROMPT),
    tools: [EMIT_FEEDBACK_TOOL],
    tool_choice: { type: "tool", name: "emit_feedback" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Write feedback for this session by calling emit_feedback.\n\n" +
              JSON.stringify(input, null, 2),
          },
        ],
      },
    ],
  });

  const toolUse = resp.content.find(
    (c): c is Extract<typeof c, { type: "tool_use" }> => c.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Model did not call emit_feedback");
  }
  const parsed = FeedbackResult.parse(toolUse.input);

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
