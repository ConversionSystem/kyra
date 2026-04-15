import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { createOnfleetClient } from '@/lib/onfleet/client';
import { calculateSlaStats } from '@/lib/onfleet/sla-calculator';
import type { ClientDispatchConfig, DispatchStats } from '@/lib/onfleet/types';

/**
 * Dispatch Config & Stats API
 *
 * GET  — Get dispatch config, stats, and recent events
 * PUT  — Update dispatch config
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
  const dispatch = (settings.dispatch || {}) as Partial<ClientDispatchConfig>;

  // Load recent dispatch events (50 for richer history)
  let recentEvents: unknown[] = [];
  try {
    const { data: events } = await supabase
      .from('dispatch_events')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50);
    recentEvents = events || [];
  } catch {
    // table may not exist yet
  }

  // Calculate stats from events (fallback values)
  const now = Date.now();
  const last24h = (recentEvents as any[]).filter(
    (e) => new Date(e.created_at).getTime() > now - 86400000,
  );

  const optimizationRuns = last24h.filter((e) => e.event_type === 'optimization_run');
  const slaBreachEvents = last24h.filter((e) => e.event_type === 'sla_breach');

  // Start with event-based stats as fallback
  let totalTasks24h = optimizationRuns.reduce((sum: number, e: any) => sum + (e.details?.tasksProcessed || 0), 0);
  let completedOnTime = 0;
  let slaBreaches = slaBreachEvents.length;
  let avgDeliveryMinutes = dispatch.defaultSlaTotalMinutes ?? 60;
  let activeDrivers = 0;

  // When OnFleet API key is set, fetch real data
  if (dispatch.onfleetApiKey) {
    try {
      const onfleet = createOnfleetClient(dispatch.onfleetApiKey);
      const since = now - 86400 * 1000;

      // Fetch real tasks and workers in parallel
      const [allTasks, workers] = await Promise.all([
        onfleet.listTasks(since).catch(() => []),
        onfleet.listWorkers().catch(() => []),
      ]);

      // Count active drivers (on duty)
      activeDrivers = workers.filter((w) => w.onDuty).length;

      // Total tasks = all tasks created in last 24h
      if (allTasks.length > 0) {
        totalTasks24h = allTasks.length;
      }

      // Calculate real SLA stats from completed tasks
      const completedTasks = allTasks.filter(
        (t) => t.state === 3 && t.completionDetails?.time,
      );

      if (completedTasks.length > 0) {
        const slaStats = calculateSlaStats(completedTasks, dispatch as ClientDispatchConfig);
        completedOnTime = slaStats.onTime;
        slaBreaches = slaStats.breached;
        avgDeliveryMinutes = slaStats.avgMinutes;
      }
    } catch (err) {
      console.error('[dispatch/stats] Failed to fetch OnFleet data:', err);
      // Fall back to event-based stats (already set above)
    }
  }

  const stats: DispatchStats = {
    totalTasks24h,
    completedOnTime,
    slaBreaches,
    avgDeliveryMinutes,
    activeDrivers,
    optimizationRuns24h: optimizationRuns.length,
    lastOptimization: optimizationRuns[0]?.created_at,
  };

  return NextResponse.json({
    config: {
      enabled: dispatch.enabled ?? false,
      hasApiKey: !!dispatch.onfleetApiKey,
      optimizationIntervalMinutes: dispatch.optimizationIntervalMinutes ?? 15,
      zones: dispatch.zones ?? [],
      rules: dispatch.rules ?? [],
      notificationGate: dispatch.notificationGate ?? {
        suppressOnReassign: true,
        suppressOnRouteReoptimize: true,
        cooldownMinutes: 10,
      },
      defaultSlaTotalMinutes: dispatch.defaultSlaTotalMinutes ?? 60,
      autoOptimize: dispatch.autoOptimize ?? true,
    },
    stats,
    recentEvents,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { agency } = auth.data;
  const body = await req.json();
  const supabase = createServiceClientWithoutCookies();

  const { data: existing, error: fetchError } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (existing.settings || {}) as Record<string, unknown>;
  const currentDispatch = (settings.dispatch || {}) as Record<string, unknown>;

  const updatedDispatch: Record<string, unknown> = {
    ...currentDispatch,
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    ...(body.onfleetApiKey && { onfleetApiKey: body.onfleetApiKey }),
    ...(body.optimizationIntervalMinutes !== undefined && { optimizationIntervalMinutes: body.optimizationIntervalMinutes }),
    ...(body.zones && { zones: body.zones }),
    ...(body.rules && { rules: body.rules }),
    ...(body.notificationGate && { notificationGate: body.notificationGate }),
    ...(body.defaultSlaTotalMinutes !== undefined && { defaultSlaTotalMinutes: body.defaultSlaTotalMinutes }),
    ...(body.autoOptimize !== undefined && { autoOptimize: body.autoOptimize }),
  };

  const { error: updateError } = await supabase
    .from('agency_clients')
    .update({
      settings: { ...settings, dispatch: updatedDispatch },
    })
    .eq('id', clientId)
    .eq('agency_id', agency.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'updated', dispatch: updatedDispatch });
}
