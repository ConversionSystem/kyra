import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { BreachAlert } from '@/lib/onfleet/types';

/**
 * Breach Alerts API — Returns recent SLA breach predictions for the dashboard
 *
 * GET — Retrieves sla_breach events from the last 24 hours
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { agency } = auth.data;
  const supabase = createServiceClientWithoutCookies();

  // Verify client belongs to this agency
  const { data: client, error: clientError } = await supabase
    .from('agency_clients')
    .select('id')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Fetch SLA breach events from the last 24 hours
  const since = new Date(Date.now() - 86400 * 1000).toISOString();

  const { data: events, error } = await supabase
    .from('dispatch_events')
    .select('*')
    .eq('client_id', clientId)
    .eq('event_type', 'sla_breach')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Extract BreachAlert objects from event details
  const alerts: BreachAlert[] = [];
  for (const event of events || []) {
    const details = (event.details || {}) as Record<string, unknown>;
    const eventAlerts = (details.alerts || []) as BreachAlert[];
    alerts.push(...eventAlerts);
  }

  return NextResponse.json({
    alerts,
    total: alerts.length,
    since,
  });
}
