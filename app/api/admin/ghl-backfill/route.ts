/**
 * POST /api/admin/ghl-backfill
 * 
 * One-time backfill: creates GHL sub-accounts for all paid-plan clients
 * that don't have one yet. Master admin only.
 */

import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { createGhlSubAccount } from '@/lib/ghl/agency-api';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];
const PAID_PLANS = ['starter', 'pro', 'scale'];

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!process.env.GHL_AGENCY_API_KEY) {
    return NextResponse.json({ error: 'GHL_AGENCY_API_KEY not set' }, { status: 500 });
  }

  const db = createServiceClientWithoutCookies();

  // Get all paid agencies
  const { data: agencies } = await db
    .from('agencies')
    .select('id, name, plan')
    .in('plan', PAID_PLANS);

  if (!agencies?.length) {
    return NextResponse.json({ message: 'No paid agencies found', provisioned: 0 });
  }

  const results: Array<{ clientId: string; clientName: string; locationId?: string; error?: string }> = [];

  for (const agency of agencies) {
    // Get clients without GHL location
    const { data: clients } = await db
      .from('agency_clients')
      .select('id, name')
      .eq('agency_id', agency.id)
      .is('ghl_location_id', null);

    for (const client of clients ?? []) {
      try {
        // Rate limit: GHL API can be sensitive, wait 1s between calls
        await new Promise(r => setTimeout(r, 1000));

        const subAccount = await createGhlSubAccount({
          name: client.name || `Client ${client.id.substring(0, 8)}`,
          country: 'US',
        });

        // Save location_id to DB
        await db
          .from('agency_clients')
          .update({ ghl_location_id: subAccount.id })
          .eq('id', client.id);

        results.push({
          clientId: client.id,
          clientName: client.name,
          locationId: subAccount.id,
        });

        console.log(`[ghl-backfill] ✅ ${client.name} → ${subAccount.id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          clientId: client.id,
          clientName: client.name,
          error: msg,
        });
        console.error(`[ghl-backfill] ❌ ${client.name}: ${msg}`);
      }
    }
  }

  const success = results.filter(r => r.locationId).length;
  const failed = results.filter(r => r.error).length;

  return NextResponse.json({
    message: `Provisioned ${success} GHL sub-accounts (${failed} failed)`,
    provisioned: success,
    failed,
    results,
  });
}
