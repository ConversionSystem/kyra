import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export async function GET() {
  // Auth check (cookie-based, knows current user)
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // All DB queries bypass RLS
  const admin = createServiceClientWithoutCookies();

  // Fetch agencies
  const { data: agencies, error: agErr } = await admin
    .from('agencies')
    .select('id, name, slug, plan, settings, owner_id, created_at')
    .order('created_at', { ascending: false });

  if (agErr) {
    console.error('[admin/accounts] agencies query error:', agErr.message);
    return NextResponse.json({ error: agErr.message }, { status: 500 });
  }

  if (!agencies || agencies.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch credits (one query)
  const { data: credits } = await admin
    .from('agency_credits')
    .select('agency_id, balance, lifetime_used, lifetime_purchased');

  const creditsMap = Object.fromEntries(
    (credits ?? []).map(c => [c.agency_id, c])
  );

  // Fetch client counts (one query)
  const { data: clients } = await admin
    .from('agency_clients')
    .select('agency_id, gateway_status');

  const clientsMap: Record<string, { total: number; running: number }> = {};
  for (const c of clients ?? []) {
    if (!clientsMap[c.agency_id]) clientsMap[c.agency_id] = { total: 0, running: 0 };
    clientsMap[c.agency_id].total++;
    if (c.gateway_status === 'running') clientsMap[c.agency_id].running++;
  }

  // Fetch ALL auth users in one call (much faster than 35 individual calls)
  const emailMap: Record<string, string> = {};
  try {
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of usersData?.users ?? []) {
      if (u.email) emailMap[u.id] = u.email;
    }
  } catch (e) {
    console.error('[admin/accounts] listUsers error:', e);
    // non-fatal — emails will just be null
  }

  const result = agencies.map(a => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    plan: a.plan,
    account_type: (a.settings as Record<string, unknown>)?.account_type ?? 'agency',
    owner_id: a.owner_id,
    email: emailMap[a.owner_id] ?? null,
    created_at: a.created_at,
    website_url: (a.settings as Record<string, unknown>)?.website_url ?? null,
    credits: creditsMap[a.id] ?? { balance: 0, lifetime_used: 0, lifetime_purchased: 0 },
    clients: clientsMap[a.id] ?? { total: 0, running: 0 },
    solo_client_id: (a.settings as Record<string, unknown>)?.solo_client_id ?? null,
  }));

  return NextResponse.json(result);
}
