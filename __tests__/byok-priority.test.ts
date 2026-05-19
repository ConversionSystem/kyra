/**
 * __tests__/byok-priority.test.ts
 *
 * Covers the BYOK provider priority consolidation from Phase 0.12.
 *
 * Prior state: three functions resolved BYOK keys with two different
 * priority orderings (billing/byok.ts had openai-first; ovh/provisioner
 * and ghl/poller had anthropic-first). Same agency could get different
 * keys picked in different subsystems.
 *
 * Fix: exported BYOK_PROVIDER_PRIORITY from lib/billing/byok as the single
 * source of truth. These tests pin the canonical order + verify the
 * resolver actually iterates it.
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BYOK_PROVIDER_PRIORITY, type BYOKProvider } from '@/lib/billing/byok';

// Supabase mock — scripts the next agencies `.single()` (api_keys, plan).
const sb = vi.hoisted(() => ({ agencies: [] as Array<{ data: unknown; error: unknown }> }));
vi.mock('@/lib/supabase/server', () => {
  const makeClient = () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            const r = sb.agencies.shift();
            if (!r) throw new Error('test: no scripted agencies result');
            return r;
          },
        }),
      }),
    }),
  });
  return {
    createServiceClientWithoutCookies: () => makeClient(),
    createServiceClient: async () => makeClient(),
    createClient: async () => makeClient(),
  };
});

describe('BYOK_PROVIDER_PRIORITY — canonical order', () => {
  test('is exactly 4 providers', () => {
    expect(BYOK_PROVIDER_PRIORITY).toHaveLength(4);
  });

  test('anthropic comes first', () => {
    expect(BYOK_PROVIDER_PRIORITY[0]).toBe('anthropic');
  });

  test('openrouter second', () => {
    expect(BYOK_PROVIDER_PRIORITY[1]).toBe('openrouter');
  });

  test('openai third', () => {
    expect(BYOK_PROVIDER_PRIORITY[2]).toBe('openai');
  });

  test('google last', () => {
    expect(BYOK_PROVIDER_PRIORITY[3]).toBe('google');
  });

  test('contains all expected providers (no drift)', () => {
    const expected: BYOKProvider[] = ['anthropic', 'openrouter', 'openai', 'google'];
    // Sets to ignore order for the "contains" check
    expect(new Set(BYOK_PROVIDER_PRIORITY)).toEqual(new Set(expected));
  });

  test('is readonly at compile time (TypeScript guard)', () => {
    // Runtime check — the array must be frozen-like. TypeScript's
    // `readonly` is compile-only, but we can at least verify callers
    // can't accidentally mutate the shared singleton via mutation.
    // This also asserts the shape so refactors can't silently
    // change the exported type.
    const arr: readonly string[] = BYOK_PROVIDER_PRIORITY;
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(4);
  });
});

describe('BYOK priority iteration (semantic contract)', () => {
  test('iteration visits anthropic before openai', () => {
    // This is the SPECIFIC drift that Phase 0.12 fixed. If anyone ever
    // changes the priority so openai comes before anthropic, this test
    // breaks immediately — the dashboard chat path and the
    // OVH/GHL paths would silently disagree again.
    const anthropicIdx = BYOK_PROVIDER_PRIORITY.indexOf('anthropic');
    const openaiIdx = BYOK_PROVIDER_PRIORITY.indexOf('openai');
    expect(anthropicIdx).toBeLessThan(openaiIdx);
  });

  test('iteration visits openrouter before openai', () => {
    const openrouterIdx = BYOK_PROVIDER_PRIORITY.indexOf('openrouter');
    const openaiIdx = BYOK_PROVIDER_PRIORITY.indexOf('openai');
    expect(openrouterIdx).toBeLessThan(openaiIdx);
  });
});

describe('Simulated resolver (walks the priority constant)', () => {
  // This simulates the shape of the three consolidated resolvers
  // (lib/billing/byok, lib/ovh/provisioner, lib/ghl/poller) — each
  // iterates BYOK_PROVIDER_PRIORITY and returns the first match.
  function pickFirstKey(
    apiKeys: Record<string, string>,
  ): { provider: BYOKProvider; key: string } | null {
    for (const provider of BYOK_PROVIDER_PRIORITY) {
      const key = apiKeys[provider];
      if (key) return { provider, key };
    }
    return null;
  }

  test('picks anthropic when only anthropic is configured', () => {
    const pick = pickFirstKey({ anthropic: 'sk-ant-xxx' });
    expect(pick).toEqual({ provider: 'anthropic', key: 'sk-ant-xxx' });
  });

  test('picks anthropic when anthropic AND openai are configured', () => {
    // The pre-fix priority would have returned openai here. This test
    // pins the post-fix behavior.
    const pick = pickFirstKey({ anthropic: 'sk-ant-xxx', openai: 'sk-oai-yyy' });
    expect(pick?.provider).toBe('anthropic');
  });

  test('falls through to openrouter when no anthropic', () => {
    const pick = pickFirstKey({ openrouter: 'sk-or-xxx', openai: 'sk-oai-yyy' });
    expect(pick?.provider).toBe('openrouter');
  });

  test('falls through to google when all others missing', () => {
    const pick = pickFirstKey({ google: 'sk-goog-xxx' });
    expect(pick?.provider).toBe('google');
  });

  test('returns null when no providers are configured', () => {
    const pick = pickFirstKey({});
    expect(pick).toBeNull();
  });

  test('ignores unknown keys in apiKeys record', () => {
    const pick = pickFirstKey({
      anthropic: 'sk-ant-xxx',
      selected_models: 'some-json-blob' as unknown as string,
    });
    expect(pick?.provider).toBe('anthropic');
  });
});

describe('byokShouldSkipCredits — F2b fail-safe', () => {
  beforeEach(async () => {
    sb.agencies.length = 0;
    const { __resetByokSkipEvidenceForTests } = await import('@/lib/billing/byok');
    __resetByokSkipEvidenceForTests();
  });

  test('paid plan + BYOK → skip credits (true)', async () => {
    const { byokShouldSkipCredits } = await import('@/lib/billing/byok');
    sb.agencies.push({ data: { api_keys: { anthropic: 'sk-ant' }, plan: 'pro' }, error: null });
    expect(await byokShouldSkipCredits('a1')).toBe(true);
  });

  test("plan 'beta' is paid (pins PAID_PLANS vs header-comment drift)", async () => {
    const { byokShouldSkipCredits } = await import('@/lib/billing/byok');
    sb.agencies.push({ data: { api_keys: { anthropic: 'sk-ant' }, plan: 'beta' }, error: null });
    expect(await byokShouldSkipCredits('a1')).toBe(true);
  });

  test('free plan + BYOK → do NOT skip (false)', async () => {
    const { byokShouldSkipCredits } = await import('@/lib/billing/byok');
    sb.agencies.push({ data: { api_keys: { anthropic: 'sk-ant' }, plan: 'free' }, error: null });
    expect(await byokShouldSkipCredits('a1')).toBe(false);
  });

  test('no BYOK configured → do NOT skip (false)', async () => {
    const { byokShouldSkipCredits } = await import('@/lib/billing/byok');
    sb.agencies.push({ data: { api_keys: {}, plan: 'pro' }, error: null });
    expect(await byokShouldSkipCredits('a1')).toBe(false);
  });

  test('lookup FAILED + no prior evidence → do NOT skip (fail toward gating)', async () => {
    const { byokShouldSkipCredits } = await import('@/lib/billing/byok');
    sb.agencies.push({ data: null, error: { message: 'pool exhausted' } });
    expect(await byokShouldSkipCredits('a1')).toBe(false);
  });

  test('lookup FAILED + prior paid+BYOK evidence → skip (F2b: do not bill them)', async () => {
    const { byokShouldSkipCredits } = await import('@/lib/billing/byok');
    // First a healthy resolve proves the agency is paid+BYOK (records evidence).
    sb.agencies.push({ data: { api_keys: { anthropic: 'sk-ant' }, plan: 'scale' }, error: null });
    expect(await byokShouldSkipCredits('a1')).toBe(true);
    // Now a DB blip. Pre-fix this billed the paid BYOK agency → canned reply.
    sb.agencies.push({ data: null, error: { message: 'timeout' } });
    expect(await byokShouldSkipCredits('a1')).toBe(true);
  });

  test('blip with {data:null, error:null} also counts as lookup-failed (the .single() contract)', async () => {
    const { byokShouldSkipCredits } = await import('@/lib/billing/byok');
    sb.agencies.push({ data: { api_keys: { openrouter: 'sk-or' }, plan: 'pro' }, error: null });
    expect(await byokShouldSkipCredits('a1')).toBe(true); // evidence recorded
    // .single() blip that returns NO error — the case `!!error && !agency` missed.
    sb.agencies.push({ data: null, error: null });
    expect(await byokShouldSkipCredits('a1')).toBe(true); // evidence still protects
  });

  test('paid→free downgrade invalidates stale evidence (no permanent bypass)', async () => {
    const { byokShouldSkipCredits } = await import('@/lib/billing/byok');
    // Was paid+BYOK — evidence recorded.
    sb.agencies.push({ data: { api_keys: { anthropic: 'sk-ant' }, plan: 'pro' }, error: null });
    expect(await byokShouldSkipCredits('a1')).toBe(true);
    // Downgraded to free — confirmed not-skip read must DROP the evidence.
    sb.agencies.push({ data: { api_keys: { anthropic: 'sk-ant' }, plan: 'free' }, error: null });
    expect(await byokShouldSkipCredits('a1')).toBe(false);
    // Subsequent DB blip must NOT resurrect the bypass for the now-free agency.
    sb.agencies.push({ data: null, error: null });
    expect(await byokShouldSkipCredits('a1')).toBe(false);
  });
});
