// ============================================================================
// GET /api/admin/webhook-health
//
// Returns Stripe webhook endpoint health status.
// Admin-only endpoint (checks user email against allowlist).
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWebhookHealth } from '@/lib/stripe/webhook-health';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export async function GET() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
