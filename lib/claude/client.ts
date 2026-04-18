import Anthropic from "@anthropic-ai/sdk";

/**
 * Centralized Anthropic client. We prefer Haiku 4.5 for fast/cheap
 * generation work and Sonnet 4.6 for reflective feedback. Prompt caching
 * is applied to static system content (curriculum catalog + instructions)
 * to keep recurring costs low.
 */

export const MODEL_FAST = "claude-haiku-4-5-20251001";
export const MODEL_SMART = "claude-sonnet-4-6";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

/**
 * Content block with cache_control for the system prompt.
 * The caller passes one long, reusable system string so the server
 * can cache it across requests.
 */
export function cachedSystemBlocks(text: string): Array<{
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}> {
  return [{ type: "text", text, cache_control: { type: "ephemeral" } }];
}
