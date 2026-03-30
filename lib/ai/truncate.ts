/**
 * Context window truncation — prevents runaway token costs.
 *
 * Keeps the most recent messages that fit within a token budget.
 * Always preserves the system prompt (handled separately by callers).
 * Truncates from oldest messages first.
 *
 * Token estimation: ~4 characters per token (conservative for English text).
 */

const CHARS_PER_TOKEN = 4;

export const MAX_INPUT_TOKENS = 80_000;

interface TruncatableMessage {
  role: string;
  content: string | unknown;
}

/** Rough token estimate for a message. */
function estimateTokens(msg: TruncatableMessage): number {
  const text = typeof msg.content === 'string'
    ? msg.content
    : JSON.stringify(msg.content);
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Keep only the most recent messages that fit within `maxTokens`.
 * Removes oldest messages first.
 */
export function truncateHistory<T extends TruncatableMessage>(
  messages: T[],
  maxTokens: number = MAX_INPUT_TOKENS,
): T[] {
  if (messages.length === 0) return messages;

  // Walk backward from newest, accumulating token count
  let budget = maxTokens;
  let cutoff = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    const cost = estimateTokens(messages[i]);
    if (budget - cost < 0) {
      cutoff = i + 1;
      break;
    }
    budget -= cost;
    if (i === 0) cutoff = 0;
  }

  return messages.slice(cutoff);
}
