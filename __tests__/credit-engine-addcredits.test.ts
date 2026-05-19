/**
 * __tests__/credit-engine-addcredits.test.ts
 *
 * Regression suite for the ledger-first / idempotent addCredits rewrite.
 *
 * The old addCredits updated agency_credits.balance BEFORE a
 * fire-and-forget credit_transactions insert whose error was swallowed.
 * Under concurrent grants for the same stripe_payment_intent_id the balance
 * was double-incremented while the partial unique index silently rejected
 * the duplicate row — an over-credit with no audit trail.
 *
 * The rewrite inserts the ledger row FIRST and only applies the balance
 * delta when that insert succeeds. A 23505 unique violation means the grant
 * already landed → idempotent no-op (no balance mutation).
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';

const sb = vi.hoisted(() => ({
  insertResult: { error: null as null | { code?: string; message?: string } },
  insertCalls: [] as Array<Record<string, unknown>>,
  selectSingle: [] as Array<{ data: unknown }>,
  updateResult: { data: null as unknown },
  updateCalls: 0,
}));

vi.mock('@/lib/supabase/server', () => {
  const makeClient = () => ({
    from: (_table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        sb.insertCalls.push(row);
        return sb.insertResult;
      },
      upsert: async () => ({ error: null }),
      select: () => ({
        eq: () => ({
          single: async () => sb.selectSingle.shift() ?? { data: null },
        }),
      }),
      update: () => {
        sb.updateCalls++;
        return {
          eq: () => ({
            select: () => ({
              single: async () => sb.updateResult,
            }),
          }),
        };
      },
    }),
    // addCredits never calls auth, but credit-engine's module graph might.
    auth: { admin: { getUserById: async () => ({ data: { user: null }, error: null }) } },
  });
  return {
    createServiceClientWithoutCookies: () => makeClient(),
    createServiceClient: async () => makeClient(),
    createClient: async () => makeClient(),
  };
});

describe('addCredits — ledger-first idempotency', () => {
  beforeEach(() => {
    sb.insertResult = { error: null };
    sb.insertCalls = [];
    sb.selectSingle = [];
    sb.updateResult = { data: null };
    sb.updateCalls = 0;
  });

  test('new grant: inserts ledger row first, then applies balance once', async () => {
    const { addCredits } = await import('@/lib/billing/credit-engine');
    sb.insertResult = { error: null };
    sb.selectSingle = [{ data: { balance: 100, lifetime_purchased: 0 } }];
    sb.updateResult = { data: { balance: 175 } };

    const result = await addCredits('agency-1', 75, 'bonus', 'monthly', 'invoice:1');

    expect(result).toBe(175);
    expect(sb.insertCalls).toHaveLength(1);
    expect(sb.insertCalls[0].stripe_payment_intent_id).toBe('invoice:1');
    expect(sb.insertCalls[0].amount).toBe(75);
    expect(sb.updateCalls).toBe(1); // balance applied exactly once
  });

  test('duplicate (23505): idempotent no-op, balance NEVER mutated', async () => {
    const { addCredits } = await import('@/lib/billing/credit-engine');
    sb.insertResult = { error: { code: '23505', message: 'unique_violation' } };
    sb.selectSingle = [{ data: { balance: 175 } }]; // already-granted balance

    const result = await addCredits('agency-1', 75, 'bonus', 'monthly', 'invoice:1');

    expect(result).toBe(175);          // returns existing balance
    expect(sb.updateCalls).toBe(0);    // THE fix: no balance write on a dup
  });

  test('non-23505 insert error: no balance mutation, error not swallowed', async () => {
    const { addCredits } = await import('@/lib/billing/credit-engine');
    sb.insertResult = { error: { code: '08006', message: 'connection failure' } };
    sb.selectSingle = [{ data: { balance: 50 } }];

    const result = await addCredits('agency-1', 75, 'bonus', 'monthly', 'invoice:1');

    expect(result).toBe(50);        // current balance, delta NOT applied
    expect(sb.updateCalls).toBe(0); // a real insert failure must not credit
  });

  test('concurrent same key → balance incremented exactly once', async () => {
    const { addCredits } = await import('@/lib/billing/credit-engine');
    // Call 1: insert wins, balance 100 → 175.
    sb.insertResult = { error: null };
    sb.selectSingle = [{ data: { balance: 100, lifetime_purchased: 0 } }];
    sb.updateResult = { data: { balance: 175 } };
    const r1 = await addCredits('agency-1', 75, 'bonus', 'monthly', 'invoice:1');

    // Call 2: same key, the unique index rejects the duplicate row.
    sb.insertResult = { error: { code: '23505' } };
    sb.selectSingle = [{ data: { balance: 175 } }];
    const r2 = await addCredits('agency-1', 75, 'bonus', 'monthly', 'invoice:1');

    expect(r1).toBe(175);
    expect(r2).toBe(175);
    expect(sb.updateCalls).toBe(1); // exactly one balance apply across both
  });

  test('keyless grant (no stripePaymentIntentId): inserts NULL key, applies', async () => {
    const { addCredits } = await import('@/lib/billing/credit-engine');
    sb.insertResult = { error: null };
    sb.selectSingle = [{ data: { balance: 0, lifetime_purchased: 0 } }];
    sb.updateResult = { data: { balance: 500 } };

    const result = await addCredits('agency-2', 500, 'purchase', 'top-up');

    expect(result).toBe(500);
    expect(sb.insertCalls[0].stripe_payment_intent_id).toBeNull();
    expect(sb.updateCalls).toBe(1);
  });
});
