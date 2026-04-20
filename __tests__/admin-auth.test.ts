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
import { describe, test, expect, afterEach, beforeEach } from 'vitest';

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
