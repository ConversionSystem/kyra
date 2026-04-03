// ============================================================================
// POST /api/admin/ghl-register-webhooks
//
// Bulk-registers Kyra's webhook URL with all GHL-connected clients.
// Use this to retroactively onboard existing clients to webhook-only mode.
//
// Auth: KYRA_API_SECRET or CRON_SECRET in Authorization header.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { registerWebhooks, getKyraWebhookUrl } from '@/lib/ghl/webhooks';

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const apiSecret = process.env.KYRA_API_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  if (!token || (token !== apiSecret && token !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Fetch all GHL-connected clients ───────────────────────────────────────
  const supabase = createServiceClientWithoutCookies();

  const { data: clients, error } = await supabase
    .from('agency_clients')
    .select('id, name, ghl_private_token, ghl_location_id')
    .not('ghl_private_token', 'is', null)
    .not('ghl_location_id', 'is', null)
    .eq('status', 'active');

  if (error) {
    console.error('[ghl-register-webhooks] Failed to fetch clients:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const webhookUrl = getKyraWebhookUrl();
  let registered = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const client of clients ?? []) {
    try {
      const result = await registerWebhooks(
        client.ghl_private_token as string,
        client.ghl_location_id as string,
        webhookUrl,
      );

      if (result) {
        registered++;
        console.log(`[ghl-register-webhooks] ✅ ${client.name} (${client.ghl_location_id})`);
      } else {
        failed++;
        const msg = `${client.name} (${client.id}): registerWebhooks returned null`;
        errors.push(msg);
        console.warn(`[ghl-register-webhooks] ❌ ${msg}`);
      }
    } catch (err) {
      failed++;
      const msg = `${client.name} (${client.id}): ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error(`[ghl-register-webhooks] ❌ ${msg}`);
    }
  }

  console.log(`[ghl-register-webhooks] Done — registered: ${registered}, failed: ${failed}`);

  return NextResponse.json({ registered, failed, errors });
}
