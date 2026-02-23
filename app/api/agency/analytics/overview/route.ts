// GET /api/agency/analytics/overview
// Cross-client aggregate analytics for the agency overview dashboard.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  const sb = await createClient();
  const sbService = await createServiceClient();

  const { data: { session } } = await sb.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: agency } = await sbService.from('agencies').select('id').eq('owner_id', session.user.id).single();
  if (!agency) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [todayConvs, weekConvs, weekEsc, clients, topClient] = await Promise.all([
    // Conversations today
    sbService.from('client_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id)
      .gte('created_at', todayStart.toISOString()),

    // Conversations this week
    sbService.from('client_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id)
      .gte('created_at', weekStart.toISOString()),

    // Escalations this week
    sbService.from('client_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id)
      .gte('created_at', weekStart.toISOString())
      .ilike('ai_response', '%flag this for our team%'),

    // Active clients count
    sbService.from('agency_clients')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id)
      .eq('status', 'active'),

    // Busiest client this week (by conversation count)
    sbService.from('client_conversations')
      .select('client_id, agency_clients(name)')
      .eq('agency_id', agency.id)
      .gte('created_at', weekStart.toISOString()),
  ]);

  // Tally conversations per client
  const clientCounts: Record<string, { name: string; count: number }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (topClient.data ?? []).forEach((row: any) => {
    const clients = Array.isArray(row.agency_clients) ? row.agency_clients : [row.agency_clients];
    const name = clients[0]?.name ?? 'Unknown';
    const id: string = row.client_id;
    if (!clientCounts[id]) clientCounts[id] = { name, count: 0 };
    clientCounts[id].count++;
  });

  const sorted = Object.entries(clientCounts).sort((a, b) => b[1].count - a[1].count);
  const busiest = sorted[0] ? { name: sorted[0][1].name, count: sorted[0][1].count } : null;

  return NextResponse.json({
    conversations_today: todayConvs.count ?? 0,
    conversations_week: weekConvs.count ?? 0,
    escalations_week: weekEsc.count ?? 0,
    active_clients: clients.count ?? 0,
    busiest_client: busiest,
    resolution_rate_week: (() => {
      const total = weekConvs.count ?? 0;
      const esc = weekEsc.count ?? 0;
      return total > 0 ? Math.round(((total - esc) / total) * 100) : 100;
    })(),
  });
}
