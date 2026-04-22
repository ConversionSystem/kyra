import { describe, it, expect } from 'vitest';
import { CREDIT_COSTS, getCreditCost } from '@/lib/billing/credit-engine';

describe('Dispatch agent credit actions', () => {
  it('exposes the 4 new dispatch action types', () => {
    expect(CREDIT_COSTS).toHaveProperty('dispatch.brain_call');
    expect(CREDIT_COSTS).toHaveProperty('dispatch.sms_writer_call');
    expect(CREDIT_COSTS).toHaveProperty('dispatch.copilot_call');
    expect(CREDIT_COSTS).toHaveProperty('dispatch.inbound_customer_call');
  });

  it('costs reflect the model routing plan (Sonnet heavier than Haiku)', () => {
    // Brain + Copilot use Sonnet — heavier cost per invocation.
    // SMS Writer + Inbound use Haiku — cheap, high-volume.
    expect(getCreditCost('dispatch.brain_call')).toBeGreaterThanOrEqual(
      getCreditCost('dispatch.sms_writer_call'),
    );
    expect(getCreditCost('dispatch.copilot_call')).toBeGreaterThanOrEqual(
      getCreditCost('dispatch.inbound_customer_call'),
    );
  });

  it('Haiku-backed agents remain affordable (≤1 credit per invocation)', () => {
    expect(getCreditCost('dispatch.sms_writer_call')).toBeLessThanOrEqual(1);
    expect(getCreditCost('dispatch.inbound_customer_call')).toBeLessThanOrEqual(1);
  });
});
