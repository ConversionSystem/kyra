// ============================================================================
// Smart Model Router — Provider-aware routing (Widget / GHL)
//
// NOTE: There is a separate dashboard model router at lib/ai/model-router.ts
// which uses a tier system (economy/standard/premium) with agency config.
// The two routers share similar classification logic but serve different
// use cases. Keep classification heuristics in sync when updating either.
//
// Classifies message complexity → selects cheapest model that can handle it
// Saves 60-87% on API costs vs always using the top model
//
// Cost benchmarks per 1M tokens (input/output):
//   Claude Haiku 3.5: $0.80/$4        ← budget
//   Claude Sonnet 3.5: $3/$15          ← mid
//   Claude Opus 3:  $15/$75            ← top
//   GPT-4o-mini:    $0.15/$0.60        ← budget
//   GPT-4o:         $2.50/$10          ← top
//   Gemini Flash:   $0.075/$0.30       ← budget
//   Llama 3.1 70B:  $0.35/$0.40        ← budget
// ============================================================================

export type MessageComplexity = 'simple' | 'medium' | 'complex';

// Provider-aware model tier map
const MODEL_TIERS: Record<string, { simple: string; medium: string; complex: string }> = {
  anthropic: {
    simple: 'claude-haiku-3-5',
    medium: 'claude-haiku-3-5',
    complex: 'claude-sonnet-3-5', // fallback to sonnet if agency hasn't configured
  },
  openai: {
    simple: 'gpt-4o-mini',
    medium: 'gpt-4o-mini',
    complex: 'gpt-4o',
  },
  google: {
    simple: 'gemini-2.0-flash',
    medium: 'gemini-2.0-flash',
    complex: 'gemini-2.0-pro',
  },
  openrouter: {
    simple: 'meta-llama/llama-3.1-8b-instruct',
    medium: 'meta-llama/llama-3.1-70b-instruct',
    complex: 'anthropic/claude-3.5-sonnet',
  },
};

// Cost ratios relative to top model (for logging)
const COST_SAVINGS: Record<MessageComplexity, number> = {
  simple: 87,    // Haiku is ~87% cheaper than Opus
  medium: 60,    // Haiku/mini still ~60% cheaper than top
  complex: 0,    // Use agency's configured model
};

// ─── Complexity Signals ─────────────────────────────────────────────────────

// Patterns that indicate SIMPLE messages (use budget model)
const SIMPLE_PATTERNS: RegExp[] = [
  /^(hi|hey|hello|yo|hola|sup|what'?s up)[?!.,]?$/i,
  /^(yes|no|ok|okay|sure|nope|yep|yeah|nah)[?!.,]?$/i,
  /^(thanks?|thank you|thx|ty)[?!.,]?$/i,
  /^(bye|goodbye|see ya|later)[?!.,]?$/i,
  /^(good morning|good afternoon|good evening|good night)[?!.,]?$/i,
  /^(how much|what'?s the price|how do i book|what are your hours)[?!.,]?$/i,
  /^\d{1,5}[?!.]?$/, // short number (e.g. "3" or "12345")
];

// Keywords that indicate COMPLEX messages (use agency's configured model)
const COMPLEX_KEYWORDS: string[] = [
  'explain', 'analyze', 'compare', 'difference between', 'how does',
  'why does', 'what if', 'step by step', 'detailed', 'breakdown',
  'calculate', 'strategy', 'plan', 'recommend', 'suggest', 'advice',
  'complaint', 'refund', 'legal', 'lawsuit', 'dispute', 'urgent',
  'emergency', 'problem', 'issue', 'broken', 'not working', 'error',
  'cancel my', 'cancellation', 'contract', 'terms', 'conditions',
  // Technical / dev complexity signals
  'debug', 'implement', 'refactor', 'code', 'script', 'function',
  'database', 'integration', 'workflow', 'automate',
];

/**
 * Classify the complexity of an incoming message.
 *
 * Order of checks (first match wins):
 *  1. Structural complexity guards (length, code, URLs, multiline) → complex
 *  2. COMPLEX_KEYWORDS → complex
 *  3. SIMPLE_PATTERNS (greetings, confirmations) → simple
 *  4. Very short (≤ 6 words, ≤ 80 chars) → simple
 *  5. Short-ish (≤ 15 words, ≤ 160 chars) → medium
 *  6. Default → complex (safe — don't risk quality)
 */
export function classifyMessage(message: string): MessageComplexity {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  // 1. Structural guards — long/code/URL/multi-line messages always need reasoning
  if (trimmed.length > 300) return 'complex';
  if (/```|`/.test(trimmed)) return 'complex';                          // code fences
  if (/https?:\/\/|www\./i.test(trimmed)) return 'complex';             // URLs
  if ((trimmed.match(/\n/g) ?? []).length > 2) return 'complex';        // multi-line

  // 2. Complex keyword match
  if (COMPLEX_KEYWORDS.some((kw) => lower.includes(kw))) return 'complex';

  // 3. Simple pattern match (greetings, confirmations, etc.)
  if (SIMPLE_PATTERNS.some((p) => p.test(trimmed))) return 'simple';

  // 4. Very short → simple
  if (wordCount <= 6 && trimmed.length <= 80) return 'simple';

  // 5. Moderate length → medium (budget model handles it fine)
  if (wordCount <= 15 && trimmed.length <= 160) return 'medium';

  // 6. Default → complex
  return 'complex';
}

/**
 * Given a provider and the agency's configured model,
 * select the best (cheapest) model that can handle the message.
 *
 * - simple/medium → downgrade to cheaper tier
 * - complex → use agency's configured model
 *
 * @param provider - anthropic | openai | google | openrouter
 * @param agencyModel - agency's selected model (used for complex messages)
 * @param message - incoming user message
 * @returns { model, complexity, savingsPct }
 */
export function routeMessage(
  provider: string,
  agencyModel: string,
  message: string,
): { model: string; complexity: MessageComplexity; savingsPct: number } {
  const complexity = classifyMessage(message);

  if (complexity === 'complex') {
    // Always use the agency's configured model for complex messages
    return { model: agencyModel, complexity, savingsPct: 0 };
  }

  const tiers = MODEL_TIERS[provider];
  if (!tiers) {
    // Unknown provider — fall back to agency model
    return { model: agencyModel, complexity, savingsPct: 0 };
  }

  const downgradedModel = tiers[complexity];
  return {
    model: downgradedModel,
    complexity,
    savingsPct: COST_SAVINGS[complexity],
  };
}
