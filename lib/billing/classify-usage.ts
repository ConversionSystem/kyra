import type { CreditAction } from '@/lib/billing/credit-engine';

/**
 * Classify a chat message into a CreditAction based on content analysis.
 * Shared between dashboard chat and widget chat to ensure consistent billing.
 */
export function classifyUsage(
  message: string,
  opts?: { hasImageAttachment?: boolean },
): CreditAction {
  const hasDeepResearch = /\b(deep research|in-depth research|thorough research|research report)\b/i.test(message);
  if (hasDeepResearch) return 'chat.deep_research';

  if (opts?.hasImageAttachment) return 'chat.image_analysis';

  const hasFileAnalysis = /\b(analyze|analyse|review|summarize|summarise)\b.*\b(file|document|pdf)\b/i.test(message);
  if (hasFileAnalysis) return 'chat.file_analysis';

  const hasWebSearch = /https?:\/\/|www\./i.test(message) ||
    /\b(search|look up|find out|google|what is the latest|current price|news about)\b/i.test(message);
  if (hasWebSearch) return 'chat.web_search';

  return 'chat.message';
}
