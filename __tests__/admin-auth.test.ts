/**
 * __tests__/admin-auth.test.ts
 *
 * Covers the admin/master allowlist consolidation from Phase 0.2. Prior
 * to that commit, 36 files duplicated email allowlists and drifted.
 * These tests pin down:
 *   - canonical MASTER_EMAILS / ADMIN_EMAILS defaults
 *   - case-insensitive matching
 *   - env-var override behavior (MASTER_EMAILS / ADMIN_EMAILS add to defaults)
 *   - isMasterEmail / isAdminEmail with null/undefined/empty inputs
 *   - ADMIN is a superset of MASTER (master ⊂ admin)
 */
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';

// ── Supabase service-client mock harness ────────────────────────────────────
// No DB-path test harness existed before this. Each test scripts the result
// of the next `.single()` (the agencies read) and the next
// `auth.admin.getUserById()`. Results are FIFO queues so a test can model a
// failed first call followed by a healthy second call — the exact shape of
// the 2026-05 cache-poisoning outage.
const sb = vi.hoisted(() => ({
  agencies: [] as Array<{ data: unknown; error: unknown }>,
  users: [] as Array<{ data: unknown; error: unknown } | Error>,
  agenciesConsumed: 0,
}));

vi.mock('@/lib/supabase/server', () => {
  const makeClient = () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            sb.agenciesConsumed++;
            const r = sb.agencies.shift();
            if (!r) throw new Error('test: no scripted agencies result');
            return r;
          },
        }),
      }),
    }),
    auth: {
      admin: {
        getUserById: async () => {
          const r = sb.users.shift();
          if (r instanceof Error) throw r;
          if (!r) throw new Error('test: no scripted getUserById result');
          return r;
        },
      },
    },
  });
  return {
    createServiceClientWithoutCookies: () => makeClient(),
    createServiceClient: async () => makeClient(),
    createClient: async () => makeClient(),
  };
});

describe('lib/auth/admin — canonical email allowlists', () => {
  const originalMaster = process.env.MASTER_EMAILS;
  const originalAdmin = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    delete process.env.MASTER_EMAILS;
    delete process.env.ADMIN_EMAILS;
  });

  afterEach(() => {
    if (originalMaster === undefined) delete process.env.MASTER_EMAILS;
    else process.env.MASTER_EMAILS = originalMaster;
    if (originalAdmin === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = originalAdmin;
  });

  describe('defaults (no env vars set)', () => {
    test('MASTER_EMAILS contains hello@ and angel@', async () => {
      // Fresh module import each test to pick up env changes.
      const { MASTER_EMAILS } = await import('@/lib/auth/admin');
      expect(MASTER_EMAILS).toContain('hello@conversionsystem.com');
      expect(MASTER_EMAILS).toContain('angel@conversionsystem.com');
    });

    test('ADMIN_EMAILS is a superset of MASTER_EMAILS', async () => {
      const { MASTER_EMAILS, ADMIN_EMAILS } = await import('@/lib/auth/admin');
      for (const email of MASTER_EMAILS) {
        expect(ADMIN_EMAILS).toContain(email);
      }
    });

    test('ADMIN_EMAILS includes steve@ by default (trusted staff tier)', async () => {
      const { ADMIN_EMAILS } = await import('@/lib/auth/admin');
      expect(ADMIN_EMAILS).toContain('steve@conversionsystem.com');
    });
  });

  describe('isMasterEmail', () => {
    test('accepts canonical master emails', async () => {
      const { isMasterEmail } = await import('@/lib/auth/admin');
      expect(isMasterEmail('hello@conversionsystem.com')).toBe(true);
      expect(isMasterEmail('angel@conversionsystem.com')).toBe(true);
    });

    test('is case-insensitive', async () => {
      const { isMasterEmail } = await import('@/lib/auth/admin');
      expect(isMasterEmail('Hello@ConversionSystem.com')).toBe(true);
      expect(isMasterEmail('ANGEL@CONVERSIONSYSTEM.COM')).toBe(true);
    });

    test('rejects non-master emails', async () => {
      const { isMasterEmail } = await import('@/lib/auth/admin');
      expect(isMasterEmail('steve@conversionsystem.com')).toBe(false);
      expect(isMasterEmail('random@example.com')).toBe(false);
    });

    test('rejects null / undefined / empty string', async () => {
      const { isMasterEmail } = await import('@/lib/auth/admin');
      expect(isMasterEmail(null)).toBe(false);
      expect(isMasterEmail(undefined)).toBe(false);
      expect(isMasterEmail('')).toBe(false);
    });
  });

  describe('isAdminEmail', () => {
    test('accepts master emails', async () => {
      const { isAdminEmail } = await import('@/lib/auth/admin');
      expect(isAdminEmail('hello@conversionsystem.com')).toBe(true);
      expect(isAdminEmail('angel@conversionsystem.com')).toBe(true);
    });

    test('accepts admin-tier (steve@ by default)', async () => {
      const { isAdminEmail } = await import('@/lib/auth/admin');
      expect(isAdminEmail('steve@conversionsystem.com')).toBe(true);
    });

    test('rejects random emails', async () => {
      const { isAdminEmail } = await import('@/lib/auth/admin');
      expect(isAdminEmail('random@example.com')).toBe(false);
    });
  });

  describe('env-var override (MASTER_EMAILS)', () => {
    test('adds extra emails to MASTER allowlist', async () => {
      process.env.MASTER_EMAILS = 'alice@example.com,bob@example.com';
      // Reload module to pick up env var
      const mod = await import('@/lib/auth/admin?reload=master-extra' as string);
      expect(mod.isMasterEmail('alice@example.com')).toBe(true);
      expect(mod.isMasterEmail('bob@example.com')).toBe(true);
      // Defaults still present
      expect(mod.isMasterEmail('angel@conversionsystem.com')).toBe(true);
    });

    test('trims whitespace from comma-separated values', async () => {
      process.env.MASTER_EMAILS = '  alice@example.com ,  bob@example.com  ';
      const mod = await import('@/lib/auth/admin?reload=master-trim' as string);
      expect(mod.isMasterEmail('alice@example.com')).toBe(true);
      expect(mod.isMasterEmail('bob@example.com')).toBe(true);
    });
  });

  describe('env-var override (ADMIN_EMAILS)', () => {
    test('adds extra emails to ADMIN allowlist (e.g. webblex10@gmail.com)', async () => {
      process.env.ADMIN_EMAILS = 'webblex10@gmail.com';
      const mod = await import('@/lib/auth/admin?reload=admin-extra' as string);
      expect(mod.isAdminEmail('webblex10@gmail.com')).toBe(true);
      // But not master
      expect(mod.isMasterEmail('webblex10@gmail.com')).toBe(false);
    });
  });
});

describe('isAdminAgency — cache-poisoning regression (2026-05 outage)', () => {
  const MASTER = { data: { user: { email: 'hello@conversionsystem.com' } }, error: null };
  const NONMASTER = { data: { user: { email: 'tenant@example.com' } }, error: null };

  beforeEach(async () => {
    sb.agencies.length = 0;
    sb.users.length = 0;
    sb.agenciesConsumed = 0;
    const { __resetAdminAgencyCacheForTests } = await import('@/lib/auth/admin');
    __resetAdminAgencyCacheForTests();
  });

  test('THE regression: agencies null read then real master row → 2nd call is true', async () => {
    const { isAdminAgency } = await import('@/lib/auth/admin');
    // 1st call: transient/zero-row read. .single() returns {data:null} (no throw).
    sb.agencies.push({ data: null, error: null });
    expect(await isAdminAgency('agency-1')).toBe(false); // uncached false

    // 2nd call: the read recovers and the agency IS the platform owner.
    sb.agencies.push({ data: { owner_id: 'owner-1' }, error: null });
    sb.users.push(MASTER);
    // Pre-fix code returned the poisoned cached `false` here → the outage.
    expect(await isAdminAgency('agency-1')).toBe(true);
  });

  test('A1 variant: getUserById throws first, recovers → 2nd call is true', async () => {
    const { isAdminAgency } = await import('@/lib/auth/admin');
    sb.agencies.push({ data: { owner_id: 'owner-1' }, error: null });
    sb.users.push(new Error('auth API blip'));
    expect(await isAdminAgency('agency-1')).toBe(false); // uncached, not poisoned

    sb.agencies.push({ data: { owner_id: 'owner-1' }, error: null });
    sb.users.push(MASTER);
    expect(await isAdminAgency('agency-1')).toBe(true);
  });

  test('agencies read error (not null) is also uncached', async () => {
    const { isAdminAgency } = await import('@/lib/auth/admin');
    sb.agencies.push({ data: null, error: { message: 'pool exhausted' } });
    expect(await isAdminAgency('agency-1')).toBe(false);
    sb.agencies.push({ data: { owner_id: 'o' }, error: null });
    sb.users.push(MASTER);
    expect(await isAdminAgency('agency-1')).toBe(true);
  });

  test('confirmed positive is cached forever (no re-query)', async () => {
    const { isAdminAgency } = await import('@/lib/auth/admin');
    sb.agencies.push({ data: { owner_id: 'owner-1' }, error: null });
    sb.users.push(MASTER);
    expect(await isAdminAgency('agency-1')).toBe(true);
    const consumedAfterFirst = sb.agenciesConsumed;
    // No scripted results queued — a re-query would throw. Cached → no query.
    expect(await isAdminAgency('agency-1')).toBe(true);
    expect(sb.agenciesConsumed).toBe(consumedAfterFirst);
  });

  test('confirmed negative is cached briefly (backpressure, no re-query)', async () => {
    const { isAdminAgency } = await import('@/lib/auth/admin');
    sb.agencies.push({ data: { owner_id: 'owner-2' }, error: null });
    sb.users.push(NONMASTER);
    expect(await isAdminAgency('agency-2')).toBe(false);
    const consumed = sb.agenciesConsumed;
    expect(await isAdminAgency('agency-2')).toBe(false); // served from TTL cache
    expect(sb.agenciesConsumed).toBe(consumed);
  });

  test('E1: concurrent calls coalesce into ONE lookup (no thundering herd)', async () => {
    const { isAdminAgency } = await import('@/lib/auth/admin');
    // Exactly ONE scripted pair. If the calls did not coalesce, calls 2..5
    // would shift undefined and throw → rejected promises.
    sb.agencies.push({ data: { owner_id: 'owner-1' }, error: null });
    sb.users.push(MASTER);
    const results = await Promise.all([
      isAdminAgency('agency-1'),
      isAdminAgency('agency-1'),
      isAdminAgency('agency-1'),
      isAdminAgency('agency-1'),
      isAdminAgency('agency-1'),
    ]);
    expect(results).toEqual([true, true, true, true, true]);
    expect(sb.agenciesConsumed).toBe(1);
  });
});
