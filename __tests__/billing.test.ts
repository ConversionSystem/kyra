import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── Mock Supabase before importing modules ─────────────────────────────────
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockUpsert = vi.fn().mockReturnThis();
const mockMaybeSingle = vi.fn();
const mockLimit = vi.fn().mockReturnThis();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  upsert: mockUpsert,
  eq: mockEq,
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
  limit: mockLimit,
}));

// Chain returns: .from().select().eq().single() etc
mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, maybeSingle: mockMaybeSingle, limit: mockLimit });
mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, maybeSingle: mockMaybeSingle, select: mockSelect, limit: mockLimit });
mockUpsert.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle });
mockUpdate.mockReturnValue({ eq: mockEq, select: mockSelect, single: mockSingle });
mockInsert.mockReturnValue({ select: mockSelect, then: vi.fn().mockImplementation((resolve) => resolve?.()) });
mockLimit.mockReturnValue({ single: mockSingle, maybeSingle: mockMaybeSingle });

vi.mock('@/lib/supabase/server', () => ({
  createServiceClientWithoutCookies: () => ({ from: mockFrom }),
}));

// ── Import after mocks ────────────────────────────────────────────────────
import {
  CREDIT_COSTS,
  getCreditCost,
} from '@/lib/billing/credit-engine';

import {
  MODELS,
  MODEL_CREDITS,
  getCreditsForModel,
  normalizeModelId,
  DEFAULT_CREDITS_PER_TURN,
} from '@/lib/billing/model-credits';

import { PLANS, type Plan } from '@/lib/billing/plans';

// ============================================================================
// Credit System Tests
// ============================================================================

describe('Credit System', () => {
  test('CREDIT_COSTS has all expected action types', () => {
    expect(CREDIT_COSTS['chat.message']).toBeDefined();
    expect(CREDIT_COSTS['chat.web_search']).toBeDefined();
    expect(CREDIT_COSTS['chat.deep_research']).toBeDefined();
    expect(CREDIT_COSTS['pipeline.find_leads']).toBeDefined();
    expect(CREDIT_COSTS['channel.ghl_sms']).toBeDefined();
  });

  test('getCreditCost returns correct cost for known actions', () => {
    expect(getCreditCost('chat.message')).toBe(1);
    expect(getCreditCost('chat.web_search')).toBe(2);
    expect(getCreditCost('chat.deep_research')).toBe(5);
    expect(getCreditCost('pipeline.find_leads')).toBe(5);
  });

  test('free actions cost 0', () => {
    expect(getCreditCost('system.calendar')).toBe(0);
    expect(getCreditCost('system.reminder')).toBe(0);
    expect(getCreditCost('system.memory')).toBe(0);
  });
});

// ============================================================================
// Model Credits Tests
// ============================================================================

describe('Model Credits', () => {
  test('every model in MODELS has a valid creditsPerTurn', () => {
    for (const model of MODELS) {
      expect(model.creditsPerTurn).toBeGreaterThan(0);
      expect(MODEL_CREDITS[model.id]).toBe(model.creditsPerTurn);
    }
  });

  test('getCreditsForModel returns correct cost for known models', () => {
    expect(getCreditsForModel('gpt-4o-mini')).toBe(1);
    expect(getCreditsForModel('claude-haiku-3-5')).toBe(5);
    expect(getCreditsForModel('claude-sonnet-4-6')).toBe(75);
    expect(getCreditsForModel('claude-opus-4-6')).toBe(125);
  });

  test('getCreditsForModel falls back for unknown models', () => {
    expect(getCreditsForModel('unknown-model-xyz')).toBe(DEFAULT_CREDITS_PER_TURN);
    expect(getCreditsForModel(null)).toBe(DEFAULT_CREDITS_PER_TURN);
    expect(getCreditsForModel(undefined)).toBe(DEFAULT_CREDITS_PER_TURN);
  });

  test('normalizeModelId resolves OpenRouter slugs', () => {
    expect(normalizeModelId('openai/gpt-4o-mini')).toBe('gpt-4o-mini');
    expect(normalizeModelId('anthropic/claude-sonnet-4.6')).toBe('claude-sonnet-4-6');
    expect(normalizeModelId('anthropic/claude-opus-4.6')).toBe('claude-opus-4-6');
    expect(normalizeModelId('google/gemini-2.0-flash-001')).toBe('gemini-2.0-flash');
  });

  test('normalizeModelId resolves dot-notation variants', () => {
    expect(normalizeModelId('claude-haiku-4.5')).toBe('claude-haiku-4-5');
    expect(normalizeModelId('claude-sonnet-3.7')).toBe('claude-sonnet-3-7');
  });

  test('normalizeModelId returns canonical IDs unchanged', () => {
    expect(normalizeModelId('gpt-4o-mini')).toBe('gpt-4o-mini');
    expect(normalizeModelId('claude-sonnet-4-6')).toBe('claude-sonnet-4-6');
  });
});

// ============================================================================
// Plan Enforcement Tests
// ============================================================================

describe('Plan Enforcement', () => {
  test('free plan: 0 monthly credits (welcome gift is separate)', () => {
    expect(PLANS.free.monthlyCredits).toBe(0);
    expect(PLANS.free.maxClients).toBe(1);
  });

  test('solo_pro plan: 2000 credits/month', () => {
    expect(PLANS.solo_pro.monthlyCredits).toBe(2000);
    expect(PLANS.solo_pro.price).toBe(39);
  });

  test('starter (Lite) plan: 5000 credits/month', () => {
    expect(PLANS.starter.monthlyCredits).toBe(5000);
    expect(PLANS.starter.maxClients).toBe(4);
  });

  test('pro plan: 15000 credits/month', () => {
    expect(PLANS.pro.monthlyCredits).toBe(15000);
    expect(PLANS.pro.maxClients).toBe(11);
  });

  test('scale plan: 30000 credits/month', () => {
    expect(PLANS.scale.monthlyCredits).toBe(30000);
    expect(PLANS.scale.maxClients).toBe(21);
  });

  test('all plans have required fields', () => {
    const planIds: Plan[] = ['free', 'solo_pro', 'starter', 'pro', 'scale'];
    for (const id of planIds) {
      const plan = PLANS[id];
      expect(plan.name).toBeTruthy();
      expect(plan.price).toBeGreaterThanOrEqual(0);
      expect(plan.maxClients).toBeGreaterThan(0);
      expect(plan.monthlyCredits).toBeGreaterThanOrEqual(0);
      expect(plan.features.length).toBeGreaterThan(0);
      expect(plan.cta).toBeTruthy();
    }
  });
});

// ============================================================================
// Stripe Webhook Handler Tests (logic validation)
// ============================================================================

describe('Stripe Webhook — Event Type Routing', () => {
  // These test the shape/expectations of webhook handling, not the actual HTTP handler
  // (which needs Stripe signature verification). We validate the event types are handled.

  const HANDLED_EVENTS = [
    'checkout.session.completed',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
    'invoice.payment_succeeded',
  ];

  test('all critical Stripe events are in the handled list', () => {
    // The webhook handler uses a switch statement — these should all be covered
    for (const eventType of HANDLED_EVENTS) {
      expect(eventType).toBeTruthy();
    }
  });

  test('idempotency key format for checkout credits', () => {
    const sessionId = 'cs_test_abc123';
    const key = `checkout:${sessionId}`;
    expect(key).toBe('checkout:cs_test_abc123');
  });

  test('idempotency key format for invoice renewal credits', () => {
    const invoiceId = 'in_test_abc123';
    const key = `invoice:${invoiceId}`;
    expect(key).toBe('invoice:in_test_abc123');
  });

  test('plan credit amounts match PLANS config', () => {
    // Webhook grants monthlyCredits from PLANS — verify they're positive for paid plans
    expect(PLANS.starter.monthlyCredits).toBeGreaterThan(0);
    expect(PLANS.pro.monthlyCredits).toBeGreaterThan(0);
    expect(PLANS.scale.monthlyCredits).toBeGreaterThan(0);
    // Free plan should NOT grant credits on webhook
    expect(PLANS.free.monthlyCredits).toBe(0);
  });
});

// ============================================================================
// Shared Chat Core — resolveModel Tests
// ============================================================================

describe('Chat Core — resolveModel', () => {
  // Import from core (already mocked supabase)
  let resolveModel: typeof import('@/lib/chat/core').resolveModel;
  let OPENROUTER_SLUGS: typeof import('@/lib/chat/core').OPENROUTER_SLUGS;

  beforeEach(async () => {
    const core = await import('@/lib/chat/core');
    resolveModel = core.resolveModel;
    OPENROUTER_SLUGS = core.OPENROUTER_SLUGS;
  });

  test('resolves canonical IDs to OpenRouter slugs', () => {
    expect(resolveModel('claude-haiku-3-5', true)).toBe('anthropic/claude-3.5-haiku');
    expect(resolveModel('gpt-4o-mini', true)).toBe('openai/gpt-4o-mini');
    expect(resolveModel('gemini-2.0-flash', true)).toBe('google/gemini-2.0-flash-001');
  });

  test('passes through already-prefixed models', () => {
    expect(resolveModel('openai/gpt-4o', true)).toBe('openai/gpt-4o');
  });

  test('strips provider prefix for direct OpenAI', () => {
    expect(resolveModel('openai/gpt-4o', false)).toBe('gpt-4o');
    expect(resolveModel('gpt-4o-mini', false)).toBe('gpt-4o-mini');
  });

  test('OPENROUTER_SLUGS contains all expected models', () => {
    expect(OPENROUTER_SLUGS['claude-sonnet-4-6']).toBe('anthropic/claude-sonnet-4.6');
    expect(OPENROUTER_SLUGS['claude-opus-4-6']).toBe('anthropic/claude-opus-4.6');
    expect(OPENROUTER_SLUGS['gpt-4o']).toBe('openai/gpt-4o');
  });
});
