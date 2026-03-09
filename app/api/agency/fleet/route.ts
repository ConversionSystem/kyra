/**
 * GET /api/agency/fleet
 * Real-time fleet status for Mission Control dashboard.
 * Returns all clients enriched with today's conversation counts and last activity.
 * Polled every 20-30s by the client component.
 */

import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAgencyCredits } from '@/lib/billing/credit-engine';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClientWithoutCookies();

  // Resolve agency
  const { data: membership } = await service
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const agencyId = membership.agency_id;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [clientsRes, creditsRes, todayConvsRes, lastMsgsRes] = await Promise.all([
    // All clients
    service
      .from('agency_clients')
      .select('id, name, gateway_status, gateway_error, usage_this_month, status')
      .eq('agency_id', agencyId)
      .order('name'),

    // Credits
    getAgencyCredits(agencyId).catch(() => ({ balance: 0, lifetimeUsed: 0, lifetimePurchased: 0 })),

    // Today's conversations per client
    service
      .from('client_conversations')
      .select('client_id, created_at')
      .eq('agency_id', agencyId)
      .gte('created_at', todayStart.toISOString()),

    // Last message per client (most recent 200)
    service
      .from('client_conversations')
      .select('client_id, created_at')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(300),
  ]);

  const clients = clientsRes.data ?? [];

  // Per-client today counts
  const perClientToday: Record<string, number> = {};
  (todayConvsRes.data ?? []).forEach(r => {
    perClientToday[r.client_id] = (perClientToday[r.client_id] || 0) + 1;
  });

  // Per-client last message
  const perClientLast: Record<string, string> = {};
  (lastMsgsRes.data ?? []).forEach(r => {
    if (!perClientLast[r.client_id]) perClientLast[r.client_id] = r.created_at;
  });

  const enriched = clients.map(c => ({
    id: c.id,
    name: c.name,
    gateway_status: c.gateway_status,
    gateway_error: c.gateway_error ?? null,
    usage_this_month: c.usage_this_month ?? 0,
    conversations_today: perClientToday[c.id] ?? 0,
    last_message_at: perClientLast[c.id] ?? null,
  }));

  const conversationsToday = (todayConvsRes.data ?? []).length;
  const running = enriched.filter(c => c.gateway_status === 'running').length;

  return NextResponse.json({
    clients: enriched,
    summary: {
      total: enriched.length,
      running,
      conversations_today: conversationsToday,
      credits_balance: creditsRes.balance,
      credits_used: creditsRes.lifetimeUsed,
    },
    ts: new Date().toISOString(),
  });
}
