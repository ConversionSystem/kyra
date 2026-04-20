// ============================================================================
// GET /api/admin/webhook-health
//
// Returns Stripe webhook endpoint health status.
// Admin-only endpoint (checks user email against allowlist).
// ============================================================================

import { NextResponse } from 'next/server';
import { requireMaster } from '@/lib/auth/admin';
import { getWebhookHealth } from '@/lib/stripe/webhook-health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;

  try {
    const health = await getWebhookHealth();
    return NextResponse.json(health);
  } catch (err) {
    console.error('[admin/webhook-health] Error:', err);
    return NextResponse.json(
      { error: 'Failed to check webhook health' },
      { status: 500 }
    );
  }
}
