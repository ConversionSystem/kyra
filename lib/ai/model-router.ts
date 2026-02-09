/**
 * Multi-Model Router — Invisible intelligence routing
 * 
 * Fast for simple queries (Haiku), smart for complex ones (Sonnet/Opus).
 * 70% cost reduction while maintaining quality where it matters.
 * 
 * The user never knows. They just experience Kyra being fast AND smart.
 */

import Anthropic from '@anthropic-ai/sdk';

export type ModelTier = 'fast' | 'balanced' | 'powerful';

export interface ModelConfig {
  id: string;
  tier: ModelTier;
  inputCostPer1M: number;   // dollars per 1M tokens
  outputCostPer1M: number;
  maxTokens: number;
  description: string;
}

export const MODELS: Record<ModelTier, ModelConfig> = {
  fast: {
    id: 'claude-3-5-haiku-20241022',
    tier: 'fast',
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
    maxTokens: 2048,
    description: 'Quick responses, simple tasks',
  },
  balanced: {
    id: 'claude-sonnet-4-20250514',
    tier: 'balanced',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    maxTokens: 4096,
    description: 'Default: good balance of speed and quality',
  },
  powerful: {
    id: 'claude-sonnet-4-20250514', // Will upgrade to Opus when available/justified
    tier: 'powerful',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    maxTokens: 8192,
    description: 'Complex reasoning, long-form writing, analysis',
  },
};

/**
 * Task complexity signals
 */
interface ComplexitySignals {
  messageLength: number;
  hasMultipleQuestions: boolean;
  requiresReasoning: boolean;
  requiresCreativity: boolean;
  isFollowUp: boolean;
  conversationDepth: number;
  hasTechnicalContent: boolean;
  isSimpleGreeting: boolean;
  requiresMemoryRecall: boolean;
}

/**
 * Analyze message complexity using fast heuristics (no API call needed)
 */
export function analyzeComplexity(
  message: string,
  conversationLength: number = 0
): ComplexitySignals {
  const lower = message.toLowerCase();
  
  return {
    messageLength: message.length,
    hasMultipleQuestions: (message.match(/\?/g) || []).length > 1,
    requiresReasoning: /\b(analyze|compare|evaluate|explain\s+why|pros\s+and\s+cons|trade.?offs?|strategy|plan|recommend)\b/i.test(message),
    requiresCreativity: /\b(write|create|draft|compose|design|brainstorm|generate|story|poem|essay|article|blog)\b/i.test(message),
    isFollowUp: conversationLength > 0 && message.length < 100,
    conversationDepth: conversationLength,
    hasTechnicalContent: /\b(code|api|sql|function|algorithm|database|deploy|infrastructure|regex|debug)\b/i.test(message),
    isSimpleGreeting: /^(hi|hello|hey|sup|yo|thanks|thank you|ok|okay|cool|nice|great|got it|bye|good\s*(morning|evening|night))[!.?\s]*$/i.test(message),
    requiresMemoryRecall: /\b(remember|recalled?|last\s+time|previously|you\s+said|we\s+discussed|told\s+you)\b/i.test(message),
  };
}

/**
 * Route to the appropriate model tier based on complexity
 */
export function routeModel(signals: ComplexitySignals): ModelTier {
  // Fast tier: greetings, short follow-ups, simple acknowledgments
  if (signals.isSimpleGreeting) return 'fast';
  if (signals.isFollowUp && signals.messageLength < 50 && !signals.requiresReasoning) return 'fast';
  
  // Powerful tier: complex reasoning, long creative tasks, technical analysis
  if (signals.requiresReasoning && signals.hasTechnicalContent) return 'powerful';
  if (signals.requiresCreativity && signals.messageLength > 200) return 'powerful';
  if (signals.hasMultipleQuestions && signals.requiresReasoning) return 'powerful';
  if (signals.messageLength > 500 && signals.requiresReasoning) return 'powerful';
  
  // Balanced tier: everything else
  return 'balanced';
}

/**
 * Get the model config for a message
 */
export function getModelForMessage(
  message: string,
  conversationLength: number = 0
): ModelConfig {
  const signals = analyzeComplexity(message, conversationLength);
  const tier = routeModel(signals);
  return MODELS[tier];
}

/**
 * Estimate cost savings from routing
 */
export function estimateSavings(routingHistory: ModelTier[]): {
  actualCost: number;
  withoutRouting: number;
  savings: number;
  savingsPercent: number;
} {
  // Assume average 500 input, 1000 output tokens per message
  const avgInput = 500;
  const avgOutput = 1000;
  
  let actualCost = 0;
  const withoutRouting = routingHistory.length * (
    (MODELS.balanced.inputCostPer1M * avgInput / 1_000_000) +
    (MODELS.balanced.outputCostPer1M * avgOutput / 1_000_000)
  );
  
  for (const tier of routingHistory) {
    const model = MODELS[tier];
    actualCost += (model.inputCostPer1M * avgInput / 1_000_000) + (model.outputCostPer1M * avgOutput / 1_000_000);
  }
  
  const savings = withoutRouting - actualCost;
  const savingsPercent = withoutRouting > 0 ? (savings / withoutRouting) * 100 : 0;
  
  return { actualCost, withoutRouting, savings, savingsPercent: Math.round(savingsPercent) };
}
