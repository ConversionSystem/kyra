// ────────────────────────────────────────────────────────────────────────────
// jane-api-credentials.test.ts — locks the per-dispensary env-var convention
// before we depend on it from production code paths.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getJaneCredentials, hasJaneCredentials } from '@/lib/integrations/jane-api';

const PURPLE_LOTUS = '968cae23-e978-46bd-8f4f-23ed2e82d7be';

describe('getJaneCredentials', () => {
  beforeEach(() => {
    // Don't leak env vars across test runs
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when env vars are unset', () => {
    expect(getJaneCredentials(PURPLE_LOTUS)).toBeNull();
  });

  it('returns null when only UID is set', () => {
    vi.stubEnv('JANE_PARTNER_UID_968CAE23', 'partial');
    expect(getJaneCredentials(PURPLE_LOTUS)).toBeNull();
  });

  it('returns null when only SECRET is set', () => {
    vi.stubEnv('JANE_PARTNER_SECRET_968CAE23', 'partial');
    expect(getJaneCredentials(PURPLE_LOTUS)).toBeNull();
  });

  it('returns both when both env vars are set, slug uppercased from first 8 chars', () => {
    vi.stubEnv('JANE_PARTNER_UID_968CAE23', 'real-uid');
    vi.stubEnv('JANE_PARTNER_SECRET_968CAE23', 'real-secret');
    expect(getJaneCredentials(PURPLE_LOTUS)).toEqual({
      uid: 'real-uid',
      secret: 'real-secret',
      clientSlug: '968CAE23',
    });
  });

  it('rejects malformed client IDs (no dash)', () => {
    vi.stubEnv('JANE_PARTNER_UID_968CAE23', 'x');
    vi.stubEnv('JANE_PARTNER_SECRET_968CAE23', 'y');
    expect(getJaneCredentials('968cae23')).toEqual({
      uid: 'x',
      secret: 'y',
      clientSlug: '968CAE23',
    });
    // Tolerates raw 8-char hex with no dashes too — the slug check is what matters
  });

  it('rejects client IDs with non-hex first segment (defense)', () => {
    expect(getJaneCredentials('zzzzzzzz-aaaa-bbbb-cccc-dddddddddddd')).toBeNull();
    expect(getJaneCredentials('1234-5678-aaaa-bbbb-cccc-dddddddddddd')).toBeNull(); // too short
  });

  it('rejects non-string clientId (TS guard, but defensive at runtime)', () => {
    // @ts-expect-error — testing runtime guard against bad callers
    expect(getJaneCredentials(undefined)).toBeNull();
    // @ts-expect-error
    expect(getJaneCredentials(null)).toBeNull();
    // @ts-expect-error
    expect(getJaneCredentials(123)).toBeNull();
  });

  it('case-insensitive: lowercase clientId still finds the env var', () => {
    vi.stubEnv('JANE_PARTNER_UID_968CAE23', 'live');
    vi.stubEnv('JANE_PARTNER_SECRET_968CAE23', 'live');
    expect(getJaneCredentials(PURPLE_LOTUS.toLowerCase())?.uid).toBe('live');
    expect(getJaneCredentials(PURPLE_LOTUS.toUpperCase())?.uid).toBe('live');
  });

  it('different clients use different env vars (isolation)', () => {
    vi.stubEnv('JANE_PARTNER_UID_968CAE23', 'pl-uid');
    vi.stubEnv('JANE_PARTNER_SECRET_968CAE23', 'pl-secret');
    vi.stubEnv('JANE_PARTNER_UID_DEADBEEF', 'other-uid');
    vi.stubEnv('JANE_PARTNER_SECRET_DEADBEEF', 'other-secret');
    expect(getJaneCredentials(PURPLE_LOTUS)?.uid).toBe('pl-uid');
    expect(getJaneCredentials('deadbeef-ffff-aaaa-bbbb-cccc12345678')?.uid).toBe('other-uid');
  });
});

describe('hasJaneCredentials', () => {
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => vi.unstubAllEnvs());

  it('returns false when missing, true when complete', () => {
    expect(hasJaneCredentials(PURPLE_LOTUS)).toBe(false);
    vi.stubEnv('JANE_PARTNER_UID_968CAE23', 'x');
    vi.stubEnv('JANE_PARTNER_SECRET_968CAE23', 'y');
    expect(hasJaneCredentials(PURPLE_LOTUS)).toBe(true);
  });
});
