import { cachedSystemBlocks, getAnthropic, MODEL_SMART } from "./client";
import { FeedbackResult } from "./schemas";

const SYSTEM_PROMPT = `
You write a tight, plain-English report for a parent on their child's
short math/spelling practice session. The kid never sees this — write
for an adult, in plain language.

Always respond by calling the "emit_feedback" tool with two fields:

- parentSummary: **max 120 words**. Three short paragraphs separated
  by blank lines:
    1. **What went well.** One sentence naming a specific strength
       (with a word/problem example).
    2. **Where they struggled.** One sentence naming a specific
       error pattern with a concrete example ("spelled 'thin' as
       'fin' twice — the /th/ sound is slipping"). Avoid clinical
       language like "inconsistency" or "reliable strategy".
    3. **Try this at home.** 1-2 concrete 5-minute activities the
       parent can do today (e.g. "have them say /th/ with their
       tongue between their teeth, then spell three words: thin,
       thumb, this" or "draw 3 ten-rods + 3 ones for 30+3 so they
       see place value"). No abstract pedagogy.
  Use real skill names ("two-digit addition", not "add_2digit_no_regroup"),
  but it's fine to include a short tag in parens for parents who want
  detail: "two-digit addition (add_2digit_no_regroup)".

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
      parentSummary: { type: "string", minLength: 1, maxLength: 1500 },
      focusSkills: {
        type: "array",
        items: { type: "string" },
        maxItems: 6,
      },
    },
    required: ["parentSummary", "focusSkills"],
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
