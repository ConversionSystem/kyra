import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createServiceClientWithoutCookies();

  // Fetch agencies
  const { data: agencies } = await admin
    .from('agencies')
    .select('id, name, slug, plan, settings, owner_id, created_at, website_url')
    .order('created_at', { ascending: false });

  if (!agencies) return NextResponse.json([]);

  // Fetch credits for all agencies
  const { data: credits } = await admin
    .from('agency_credits')
    .select('agency_id, balance, lifetime_used, lifetime_purchased');

  const creditsMap = Object.fromEntries((credits ?? []).map(c => [c.agency_id, c]));

  // Fetch client counts grouped by agency
  const { data: clients } = await admin
    .from('agency_clients')
    .select('agency_id, gateway_status');

  const clientsMap: Record<string, { total: number; running: number }> = {};
  for (const c of clients ?? []) {
    if (!clientsMap[c.agency_id]) clientsMap[c.agency_id] = { total: 0, running: 0 };
    clientsMap[c.agency_id].total++;
    if (c.gateway_status === 'running') clientsMap[c.agency_id].running++;
  }

  // Fetch auth users to get emails (batch via admin API)
  const ownerIds = [...new Set(agencies.map(a => a.owner_id).filter(Boolean))];
  const emailMap: Record<string, string> = {};

  // Fetch emails in batches of 50
  for (let i = 0; i < ownerIds.length; i += 50) {
    const batch = ownerIds.slice(i, i + 50);
    for (const uid of batch) {
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        if (data?.user?.email) emailMap[uid] = data.user.email;
      } catch {}
    }
  }

  const result = agencies.map(a => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    plan: a.plan,
    account_type: a.settings?.account_type ?? 'agency',
    owner_id: a.owner_id,
    email: emailMap[a.owner_id] ?? null,
    created_at: a.created_at,
    website_url: a.website_url,
    credits: creditsMap[a.id] ?? { balance: 0, lifetime_used: 0, lifetime_purchased: 0 },
    clients: clientsMap[a.id] ?? { total: 0, running: 0 },
    solo_client_id: a.settings?.solo_client_id ?? null,
  }));

  return NextResponse.json(result);
}
