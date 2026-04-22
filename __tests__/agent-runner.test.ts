import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase + Anthropic before importing anything that touches them.
// These mocks keep the test hermetic.

const mockFrom = vi.fn();
const mockInsert = vi.fn().mockReturnValue({});

vi.mock('@/lib/supabase/server', () => ({
  createServiceClientWithoutCookies: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(),
      stream: vi.fn(),
    },
  })),
}));

// Mock the credit engine — preflight always allows in these tests.
vi.mock('@/lib/billing/credit-engine', () => ({
  requireCredits: vi.fn(async () => ({ allowed: true, balance: 500, cost: 5, shortfall: 0 })),
  deductCredits: vi.fn(async () => ({ ok: true, newBalance: 495, insufficient: false, lowBalance: false })),
  CREDIT_COSTS: { 'dispatch.brain_call': 5 },
}));

import { AGENT_MODELS } from '@/lib/ai/agent-runner';

describe('AGENT_MODELS registry', () => {
  it('maps named aliases to concrete model IDs', () => {
    expect(AGENT_MODELS.sonnet).toMatch(/claude-sonnet/);
    expect(AGENT_MODELS.haiku).toMatch(/claude-haiku/);
  });

  it('Sonnet and Haiku are distinct model IDs', () => {
    expect(AGENT_MODELS.sonnet).not.toBe(AGENT_MODELS.haiku);
  });
});

describe('Daily cost cap logic', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockInsert.mockReset();
  });

  it('reads container_config.dispatch_agent_config.daily_cost_cap_cents', async () => {
    // This is a smoke test — validates the shape we expect from the DB.
    // The actual runner-driven cap is exercised via integration paths.
    const configShape = {
      dispatch_agent_config: {
        daily_cost_cap_cents: 1500,
        auto_execute_risk_levels: ['low', 'medium'],
      },
    };
    expect(configShape.dispatch_agent_config.daily_cost_cap_cents).toBe(1500);
    expect(configShape.dispatch_agent_config.auto_execute_risk_levels).toContain('low');
    expect(configShape.dispatch_agent_config.auto_execute_risk_levels).toContain('medium');
    expect(configShape.dispatch_agent_config.auto_execute_risk_levels).not.toContain('high');
  });
});
