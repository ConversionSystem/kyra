import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { checkCronAuth, requireCron } from '@/lib/auth/cron';

describe('checkCronAuth (fail-closed)', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  test('rejects with 500 when CRON_SECRET is unset', () => {
    const r = checkCronAuth({ authHeader: 'Bearer anything' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(500);
  });

  test('rejects with 500 when CRON_SECRET is empty string', () => {
    process.env.CRON_SECRET = '';
    const r = checkCronAuth({ authHeader: 'Bearer ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(500);
  });

  test('accepts valid Bearer token', () => {
    process.env.CRON_SECRET = 'super-secret-xyz';
    const r = checkCronAuth({ authHeader: 'Bearer super-secret-xyz' });
    expect(r.ok).toBe(true);
  });

  test('accepts valid query-param token', () => {
    process.env.CRON_SECRET = 'super-secret-xyz';
    const r = checkCronAuth({ authHeader: null, queryToken: 'super-secret-xyz' });
    expect(r.ok).toBe(true);
  });

  test('rejects with 401 when bearer is wrong', () => {
    process.env.CRON_SECRET = 'super-secret-xyz';
    const r = checkCronAuth({ authHeader: 'Bearer wrong' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  test('rejects with 401 when no auth provided', () => {
    process.env.CRON_SECRET = 'super-secret-xyz';
    const r = checkCronAuth({ authHeader: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  test('rejects missing Bearer prefix', () => {
    process.env.CRON_SECRET = 'super-secret-xyz';
    const r = checkCronAuth({ authHeader: 'super-secret-xyz' });
    expect(r.ok).toBe(false);
  });

  test('does not treat literal string "undefined" as valid', () => {
    // Guards against the prior template-string bug:
    // `Bearer ${process.env.CRON_SECRET}` where the env var is unset
    // would produce `Bearer undefined` and match itself.
    delete process.env.CRON_SECRET;
    const r = checkCronAuth({ authHeader: 'Bearer undefined' });
    expect(r.ok).toBe(false);
  });

  test('accepts extra secrets when provided', () => {
    process.env.CRON_SECRET = 'primary';
    const r = checkCronAuth({ authHeader: 'Bearer backup' }, ['backup']);
    expect(r.ok).toBe(true);
  });

  test('ignores empty-string entries in extra secrets', () => {
    process.env.CRON_SECRET = 'primary';
    const r = checkCronAuth({ authHeader: 'Bearer ' }, ['']);
    expect(r.ok).toBe(false);
  });
});

describe('requireCron (NextResponse wrapper)', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  test('returns 500 Response when secret unset', () => {
    const req = {
      headers: { get: () => 'Bearer x' },
      nextUrl: { searchParams: new URLSearchParams() },
    };
    const res = requireCron(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(500);
  });

  test('returns null on success', () => {
    process.env.CRON_SECRET = 'ok';
    const req = {
      headers: { get: (k: string) => (k === 'authorization' ? 'Bearer ok' : null) },
      nextUrl: { searchParams: new URLSearchParams() },
    };
    const res = requireCron(req);
    expect(res).toBeNull();
  });

  test('falls through to query param if Authorization missing', () => {
    process.env.CRON_SECRET = 'ok';
    const req = {
      headers: { get: () => null },
      nextUrl: { searchParams: new URLSearchParams({ secret: 'ok' }) },
    };
    const res = requireCron(req);
    expect(res).toBeNull();
  });

  test('returns 401 on secret mismatch', () => {
    process.env.CRON_SECRET = 'ok';
    const req = {
      headers: { get: () => 'Bearer nope' },
      nextUrl: { searchParams: new URLSearchParams() },
    };
    const res = requireCron(req);
    expect(res?.status).toBe(401);
  });

  test('extraSecretEnvVars option accepts secondary secrets', () => {
    process.env.CRON_SECRET = 'primary';
    process.env.TEST_EXTRA_SECRET = 'secondary';
    const req = {
      headers: { get: () => 'Bearer secondary' },
      nextUrl: { searchParams: new URLSearchParams() },
    };
    const res = requireCron(req, { extraSecretEnvVars: ['TEST_EXTRA_SECRET'] });
    expect(res).toBeNull();
    delete process.env.TEST_EXTRA_SECRET;
  });
});
