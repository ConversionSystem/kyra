/**
 * POST /api/stripe/test
 *
 * Master-only. Calls stripe.accounts.retrieve() to verify the Stripe secret
 * key is valid and returns the display name of the connected account. Used
 * from the dashboard to diagnose billing issues.
 *
 * Access is gated by requireMaster() (Phase 0.2).
 * Access is logged for audit trail (Phase 0.15).
 * Response carries X-Robots-Tag: noindex.
 */
import { NextResponse } from 'next/server';
import { requireMaster } from '@/lib/auth/admin';
import { stripe } from '@/lib/stripe/config';

export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;

  console.log(
    `[stripe/test] access by ${auth.user.email ?? auth.user.id} at ${new Date().toISOString()}`,
  );

  const headers = { 'X-Robots-Tag': 'noindex, nofollow' };

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { ok: false, error: 'STRIPE_SECRET_KEY is not set' },
      { headers },
    );
  }

  try {
    const account = await stripe.accounts.retrieve();
    return NextResponse.json(
      { ok: true, accountName: account.settings?.dashboard?.display_name || account.id },
      { headers },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { headers });
  }
}
