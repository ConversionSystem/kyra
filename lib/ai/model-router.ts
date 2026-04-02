// ============================================================================
// Model Router — Smart routing between cheap and expensive models
//
// Analyzes message complexity to decide which model to use.
// Simple messages (greetings, confirmations, FAQs) → Haiku (economy)
// Standard conversations → Sonnet (standard)  
// Complex queries (sales objections, multi-step, detailed analysis) → Opus (premium)
// ============================================================================

import type { ModelTier, ModelRoutingConfig } from '@/lib/agency/types';
import { MODEL_TIERS } from '@/lib/agency/types';

// Simple patterns that should use economy tier
const ECONOMY_PATTERNS = [
  // Greetings
  /^(hi|hello|hey|good morning|good afternoon|good evening|yo|sup)\b/i,
  // Simple confirmations
  /^(yes|no|ok|okay|sure|thanks|thank you|got it|sounds good|perfect|great)\b/i,
  // NOTE: removed /^.{1,20}$/ — it routed high-stakes short messages (e.g. "refund now",
  //       "cancel order", "I'm angry") to the cheapest model. Dangerous catch-all.
  // Time/availability checks
  /^(what time|when are you|are you open|hours|schedule)\b/i,
  // Simple questions
  /^(where are you|what's your address|location|directions)\b/i,
  // Status checks
  /^(status|update|tracking|order status)\b/i,
];

// Keywords that signal complexity — short messages containing these must NOT go economy
const COMPLEX_KEYWORDS = [
  'explain', 'analyze', 'compare', 'difference between', 'how does',
  'why does', 'what if', 'step by step', 'detailed', 'breakdown',
  'calculate', 'strategy', 'plan', 'recommend', 'suggest', 'advice',
  'complaint', 'refund', 'legal', 'lawsuit', 'dispute', 'urgent',
  'emergency', 'problem', 'issue', 'broken', 'not working', 'error',
  'cancel my', 'cancellation', 'contract', 'terms', 'conditions',
  'debug', 'implement', 'refactor', 'code', 'script', 'function',
  'database', 'integration', 'workflow', 'automate',
];

// Complex patterns that should use premium tier
const PREMIUM_PATTERNS = [
  // Price negotiations
  /\b(discount|negotiate|too expensive|lower price|best price|budget|afford|deal)\b/i,
  // Complaints/escalations
  /\b(complaint|unhappy|frustrated|terrible|awful|worst|manager|refund|cancel|lawyer|sue)\b/i,
  // Multi-part questions (contains "and" with question marks)
  /\?.*\band\b.*\?/i,
  // Long detailed messages (200+ chars with questions)
  /^.{200,}.*\?/,
  // Comparison shopping
  /\b(compare|vs|versus|difference between|which is better|competitor)\b/i,
  // Technical complexity
  /\b(integrate|API|technical|specification|requirements|custom|enterprise)\b/i,
  // High-value signals
  /\b(contract|annual|volume|bulk|fleet|franchise|multiple locations)\b/i,
];

/**
 * Determine the appropriate model tier based on message content and client config.
 */
export function routeMessage(
  message: string,
  config?: ModelRoutingConfig | null,
): { tier: ModelTier; model: string; reason: string } {
  // If config specifies a forced model, use it
  if (config?.forceModel) {
    return {
      tier: 'standard',
      model: config.forceModel,
      reason: 'Forced model override',
    };
  }

  // If auto-routing is disabled, use the default tier
  if (config && !config.autoRoute) {
    const tier = config.defaultTier || 'standard';
    return {
      tier,
      model: MODEL_TIERS[tier].model,
      reason: `Default tier (auto-routing disabled)`,
    };
  }

  // Check premium patterns first (agency-specific)
  if (config?.premiumPatterns) {
    for (const pattern of config.premiumPatterns) {
      try {
        if (new RegExp(pattern, 'i').test(message)) {
          return {
            tier: 'premium',
            model: MODEL_TIERS.premium.model,
            reason: `Matched agency premium pattern: ${pattern}`,
          };
        }
      } catch {
        // Invalid regex, skip
      }
    }
  }

  // Check built-in premium patterns
  for (const pattern of PREMIUM_PATTERNS) {
    if (pattern.test(message)) {
      return {
        tier: 'premium',
        model: MODEL_TIERS.premium.model,
        reason: `Complex message detected (${pattern.source.substring(0, 40)}...)`,
      };
    }
  }

  // Hard guards — if any of these are true, skip economy entirely.
  // Long/code/URL/multiline messages need reasoning even when short in word count.
  const lower = message.toLowerCase();
  const wordCount = message.trim().split(/\s+/).filter(Boolean).length;
  const hasStructuralComplexity =
    message.length > 300 ||
    /```|`/.test(message) ||
    /https?:\/\/|www\./i.test(message) ||
    (message.match(/\n/g) ?? []).length > 2;

  if (!hasStructuralComplexity) {
    // Check ECONOMY_PATTERNS (safe to do now that structural guards passed)
    for (const pattern of ECONOMY_PATTERNS) {
      if (pattern.test(message)) {
        return {
          tier: 'economy',
          model: MODEL_TIERS.economy.model,
          reason: `Simple message detected (${pattern.source.substring(0, 40)}...)`,
        };
      }
    }

    // Very short message with no complex keywords → economy
    const hasComplexKeyword = COMPLEX_KEYWORDS.some((kw) => lower.includes(kw));
    if (wordCount <= 6 && message.trim().length <= 80 && !hasComplexKeyword) {
      return {
        tier: 'economy',
        model: MODEL_TIERS.economy.model,
        reason: 'Short message, no complex signals',
      };
    }

    // Moderate length → standard (not worth upgrading to premium)
    if (wordCount <= 15 && message.trim().length <= 160) {
      return {
        tier: 'standard',
        model: MODEL_TIERS.standard.model,
        reason: 'Moderate length message',
      };
    }
  }

  // Default to standard
  const tier = config?.defaultTier || 'standard';
  return {
    tier,
    model: MODEL_TIERS[tier].model,
    reason: 'Default routing (no pattern match)',
  };
}

/**
 * Estimate cost savings from model routing over a set of messages.
 */
export function estimateRoutingSavings(
  messages: Array<{ inbound: string; outbound: string }>,
): {
  withoutRouting: number;
  withRouting: number;
  savingsPercent: number;
  tierBreakdown: Record<ModelTier, number>;
} {
  let withoutRouting = 0;
  let withRouting = 0;
  const tierBreakdown: Record<ModelTier, number> = { economy: 0, standard: 0, premium: 0 };

  const standardCost = MODEL_TIERS.standard.costPer1kTokens;

  for (const msg of messages) {
    const inTokens = Math.ceil(msg.inbound.length / 4) + 500;
    const outTokens = Math.ceil(msg.outbound.length / 4);
    const totalTokensK = (inTokens + outTokens) / 1000;

    // Without routing: everything goes to standard
    withoutRouting += totalTokensK * standardCost;

    // With routing: route each message
    const route = routeMessage(msg.inbound);
    const routedCost = MODEL_TIERS[route.tier].costPer1kTokens;
    withRouting += totalTokensK * routedCost;
    tierBreakdown[route.tier]++;
  }

  const savingsPercent = withoutRouting > 0
    ? Math.round((1 - withRouting / withoutRouting) * 100)
    : 0;

  return { withoutRouting, withRouting, savingsPercent, tierBreakdown };
}

// ============================================================================
// Backward-compatible exports (used by existing chat routes & channel router)
// ============================================================================

export type ModelTierLegacy = 'fast' | 'balanced' | 'powerful';

export interface ModelConfig {
  id: string;
  tier: ModelTierLegacy;
  inputCostPer1M: number;
  outputCostPer1M: number;
  maxTokens: number;
  description: string;
}

const MODELS: Record<ModelTierLegacy, ModelConfig> = {
  fast: {
    id: MODEL_TIERS.economy.model,
    tier: 'fast',
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
    maxTokens: 2048,
    description: 'Quick responses, simple tasks',
  },
  balanced: {
    id: MODEL_TIERS.standard.model,
    tier: 'balanced',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    maxTokens: 4096,
    description: 'Default: good balance of speed and quality',
  },
  powerful: {
    id: MODEL_TIERS.premium.model,
    tier: 'powerful',
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00,
    maxTokens: 8192,
    description: 'Complex reasoning, long-form writing, analysis',
  },
};

/**
 * Resolve a user's model preference into a ModelConfig.
 * Backward-compatible wrapper around routeMessage.
 */
export function resolveModelPreference(
  preference: string | undefined,
  message: string,
  conversationLength: number = 0,
): ModelConfig {
  if (preference === 'claude-sonnet-4') return MODELS.balanced;
  if (preference === 'claude-haiku') return MODELS.fast;

  if (!preference || preference === 'auto') {
    const route = routeMessage(message);
    const tierMap: Record<ModelTier, ModelTierLegacy> = {
      economy: 'fast',
      standard: 'balanced',
      premium: 'powerful',
    };
    const legacyTier = tierMap[route.tier];
    return { ...MODELS[legacyTier], id: route.model };
  }

  // Unknown preference — auto-route
  const route = routeMessage(message);
  const tierMap: Record<ModelTier, ModelTierLegacy> = {
    economy: 'fast',
    standard: 'balanced',
    premium: 'powerful',
  };
  return { ...MODELS[tierMap[route.tier]], id: route.model };
}
