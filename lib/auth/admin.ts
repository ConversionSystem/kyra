/**
 * lib/auth/admin.ts
 *
 * Single source of truth for admin / master email authorization.
 *
 * Prior state (pre-Phase 0 security cleanup): 36 files each declared their
 * own inline `ADMIN_EMAILS` or `MASTER_EMAILS` array. At least 4 distinct
 * variants existed:
 *   - ['hello@', 'angel@']                                      (most routes)
 *   - ['hello@', 'angel@', 'steve@']                            (admin/stats)
 *   - ['hello@', 'angel@', 'steve@', 'webblex10@gmail.com']     (content-calendar)
 *   - process.env.MASTER_EMAILS split by comma                  (router-migrate)
 *
 * Adding a founder's email required editing dozens of files. Predictably,
 * people got different levels of access depending on which route they hit.
 *
 * This helper enforces ONE canonical definition. Override via env vars in
 * prod. Two tiers:
 *
 *   MASTER: Conversion System platform owners. Full access — impersonation,
 *           billing mutations, VPS health, master stats, Stripe config.
 *           Default: hello@conversionsystem.com, angel@conversionsystem.com
 *
 *   ADMIN:  Master + trusted operators (founders, senior staff). Access to
 *           stats dashboards, content calendar, nurture audits, customer
 *           impersonation for support.
 *           Default: Master + steve@conversionsystem.com
 *
 * Env vars (comma-separated, additive to defaults):
 *   MASTER_EMAILS="extra1@example.com,extra2@example.com"
 *   ADMIN_EMAILS="extra3@example.com"
 */

import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Defaults — the minimal required set. Rotate by editing here + env var.
const DEFAULT_MASTER_EMAILS = [
  'hello@conversionsystem.com',
  'angel@conversionsystem.com',
];
const DEFAULT_ADMIN_EXTRAS = [
  'steve@conversionsystem.com',
];

function parseEnvList(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Canonical MASTER list. Platform-level access.
 */
export const MASTER_EMAILS: readonly string[] = Array.from(
  new Set([
    ...DEFAULT_MASTER_EMAILS.map((e) => e.toLowerCase()),
    ...parseEnvList(process.env.MASTER_EMAILS),
  ]),
);

/**
 * Canonical ADMIN list. Superset of MASTER + trusted operators.
 */
export const ADMIN_EMAILS: readonly string[] = Array.from(
  new Set([
    ...MASTER_EMAILS,
    ...DEFAULT_ADMIN_EXTRAS.map((e) => e.toLowerCase()),
    ...parseEnvList(process.env.ADMIN_EMAILS),
  ]),
);

// ─── Pure checks (for use in pages, components, server actions) ────────────

export function isMasterEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return MASTER_EMAILS.includes(email.toLowerCase());
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// ─── API-route guards ──────────────────────────────────────────────────────

export type AuthGuardSuccess = { ok: true; user: User };
export type AuthGuardFailure = { ok: false; response: NextResponse };
export type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure;

/**
 * Guard an API route to MASTER emails only.
 *
 * Usage:
 *   export async function GET() {
 *     const auth = await requireMaster();
 *     if (!auth.ok) return auth.response;
 *     // ... auth.user is guaranteed to be a master
 *   }
 */
export async function requireMaster(): Promise<AuthGuardResult> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!isMasterEmail(user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { ok: true, user };
}

/**
 * Guard an API route to ADMIN emails (master + trusted staff).
 *
 * Usage identical to requireMaster().
 */
export async function requireAdmin(): Promise<AuthGuardResult> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!isAdminEmail(user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { ok: true, user };
}
