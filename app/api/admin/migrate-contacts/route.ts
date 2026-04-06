// ============================================================================
// POST /api/admin/migrate-contacts
//
// Copies all agency owner emails into a client's email_contacts table.
// Body: { clientId: string }
//
// Upserts on (agency_id, client_id, email) — safe to run multiple times.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json() as { clientId?: string };
  const { clientId } = body;

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const admin = createServiceClientWithoutCookies();

  // Look up which agency owns this client
  const { data: client, error: clientErr } = await admin
    .from('agency_clients')
    .select('agency_id')
    .eq('id', clientId)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const ownerAgencyId = client.agency_id;

  // Fetch all agencies with their plan + settings
  const { data: agencies, error: agErr } = await admin
    .from('agencies')
    .select('id, name, plan, settings, owner_id');

  if (agErr) return NextResponse.json({ error: agErr.message }, { status: 500 });

  // Fetch all auth users for email lookup
  const emailMap: Record<string, string> = {};
  try {
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of usersData?.users ?? []) {
      if (u.email) emailMap[u.id] = u.email;
    }
  } catch { /* non-fatal */ }

  // Build upsert rows
  const rows = [];
  for (const agency of agencies ?? []) {
    const email = emailMap[agency.owner_id];
    if (!email) continue;

    // Derive first_name from settings or email prefix
    const settings = (agency.settings as Record<string, unknown>) ?? {};
    const firstName = (settings.first_name as string | undefined)
      ?? email.split('@')[0]
         .replace(/[._-]/g, ' ')
         .replace(/\b\w/g, c => c.toUpperCase());

    rows.push({
      agency_id: ownerAgencyId,
      client_id: clientId,
      email,
      first_name: firstName,
      tags: ['kyra-customer', agency.plan],
      source: 'admin-migration',
      status: 'active',
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  // Upsert — unique constraint on (agency_id, client_id, email)
  const { data: upserted, error: upsertErr } = await admin
    .from('email_contacts')
    .upsert(rows, { onConflict: 'agency_id,client_id,email', ignoreDuplicates: true })
    .select('id');

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  const imported = upserted?.length ?? 0;
  const skipped = rows.length - imported;

  return NextResponse.json({ imported, skipped });
}
