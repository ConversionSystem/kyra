import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const MASTER_EMAILS = ['angel@conversionsystem.com'];

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // All agencies
  const { data: agencies } = await sb
    .from('agencies')
    .select('id, name, slug, plan, account_level, created_at, settings, owner_id')
    .order('created_at', { ascending: false });

  const agencyIds = (agencies ?? []).map(a => a.id);

  // All clients
  const { data: clients } = await sb
    .from('agency_clients')
    .select('id, agency_id, name, industry, status, gateway_status, usage_this_month, billing_amount_cents, created_at')
    .in('agency_id', agencyIds.length ? agencyIds : ['00000000-0000-0000-0000-000000000000']);

  const allClients = clients ?? [];

  // Platform MRR
  const platformMrr = allClients.reduce((sum, c) => sum + (c.billing_amount_cents ?? 0), 0);

  // Clients per agency
  const clientsByAgency: Record<string, typeof allClients> = {};
  for (const c of allClients) {
    if (!clientsByAgency[c.agency_id]) clientsByAgency[c.agency_id] = [];
    clientsByAgency[c.agency_id].push(c);
  }

  // Agency owners (emails)
  const ownerIds = [...new Set((agencies ?? []).map(a => a.owner_id))];
  let ownerEmails: Record<string, string> = {};
  if (ownerIds.length) {
    const { data: profiles } = await sb
      .from('agency_members')
      .select('agency_id, user_id')
      .in('user_id', ownerIds)
      .eq('role', 'owner');
    // We can't get emails from agency_members without auth.users — use owner_id as fallback
    ownerEmails = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.user_id]));
  }

  const agenciesWithStats = (agencies ?? []).map(a => ({
    ...a,
    client_count: clientsByAgency[a.id]?.length ?? 0,
    running_clients: clientsByAgency[a.id]?.filter(c => c.gateway_status === 'running').length ?? 0,
    monthly_conversations: clientsByAgency[a.id]?.reduce((s, c) => s + c.usage_this_month, 0) ?? 0,
    monthly_revenue_cents: clientsByAgency[a.id]?.reduce((s, c) => s + c.billing_amount_cents, 0) ?? 0,
  }));

  return NextResponse.json({
    platform: {
      total_agencies: (agencies ?? []).filter(a => a.account_level !== 'master').length,
      total_clients: allClients.length,
      active_clients: allClients.filter(c => c.gateway_status === 'running').length,
      platform_mrr_cents: platformMrr,
    },
    agencies: agenciesWithStats,
  });
}
