import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { runOptimization } from '@/lib/onfleet/route-optimizer';
import type { ClientDispatchConfig } from '@/lib/onfleet/types';

/**
 * Manual Route Optimization Trigger
 * POST — Triggers a route optimization cycle for this client
 */
export async function POST(
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

  const { data, error } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (data.settings || {}) as Record<string, unknown>;
  const dispatch = settings.dispatch as ClientDispatchConfig | undefined;

  if (!dispatch?.onfleetApiKey) {
    return NextResponse.json({ error: 'OnFleet API key not configured' }, { status: 400 });
  }

  if (!dispatch.enabled) {
    return NextResponse.json({ error: 'Dispatch is not enabled' }, { status: 400 });
  }

  // Run optimization
  let result;
  try {
    result = await runOptimization(clientId, dispatch);
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Optimization failed',
    }, { status: 500 });
  }

  // Log events to dispatch_events table
  for (const event of result.events) {
    try {
      await supabase.from('dispatch_events').insert({
        client_id: event.client_id,
        event_type: event.event_type,
        details: event.details,
        tasks_affected: event.tasks_affected,
        workers_affected: event.workers_affected,
      });
    } catch {
      // table may not exist yet — skip silently
    }
  }

  return NextResponse.json({
    success: result.success,
    tasksProcessed: result.tasksProcessed,
    tasksUpdated: result.tasksUpdated,
    teamsOptimized: result.teamsOptimized,
    errors: result.errors,
  });
}
