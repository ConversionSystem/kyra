/**
 * GET /api/stripe/env-check
 *
 * Master-only. Returns booleans indicating whether each Stripe-related env
 * var is set (NOT their values). Used to debug "why isn't billing working?"
 * from inside the dashboard rather than SSHing into Vercel config.
 *
 * Access is gated by requireMaster() (consolidated in Phase 0.2).
 * Access is logged for audit trail (Phase 0.15).
 * Response carries X-Robots-Tag: noindex so it never ends up in search.
 */
import { NextResponse } from 'next/server';
import { requireMaster } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;

  console.log(
    `[stripe/env-check] access by ${auth.user.email ?? auth.user.id} at ${new Date().toISOString()}`,
  );

  return NextResponse.json(
    {
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      STRIPE_LITE_PRICE_ID: !!(process.env.STRIPE_STARTER_PRICE_ID || process.env.STRIPE_LITE_PRICE_ID),
      STRIPE_PRO_PRICE_ID: !!process.env.STRIPE_PRO_PRICE_ID,
      STRIPE_SCALE_PRICE_ID: !!process.env.STRIPE_SCALE_PRICE_ID,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    },
    { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
  );
}
