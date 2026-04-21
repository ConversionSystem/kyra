import { NextRequest, NextResponse } from 'next/server';
import { requireDispatchAgency } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { createOnfleetClient } from '@/lib/onfleet/client';
import type { ClientDispatchConfig, DriverStatus } from '@/lib/onfleet/types';

/**
 * Live Driver Statuses
 * GET — Returns current driver/worker statuses from OnFleet
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireDispatchAgency();
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

  try {
    const client = createOnfleetClient(dispatch.onfleetApiKey);
    const workers = await client.listWorkers();

    const drivers: DriverStatus[] = workers.map((w) => {
      // Break eligibility: OnFleet doesn't expose shift start directly.
      // Use metadata field "shiftStart" if set by the dispatch team,
      // otherwise fall back to checking if the driver has been continuously
      // active (timeLastSeen is recent = still on duty, but we need duration).
      // For now, use task count as a proxy — drivers with 8+ completed tasks
      // in a session are likely break-eligible. This should be refined with
      // actual shift data from OnFleet metadata or an external schedule.
      const breakEligible = w.onDuty && (w.tasks?.length ?? 0) >= 8;

      return {
        id: w.id,
        name: w.name,
        onDuty: w.onDuty,
        activeTasks: w.tasks?.length ?? 0,
        location: w.location,
        lastSeen: new Date(w.timeLastSeen * 1000).toISOString(),
        currentTaskEta: undefined,
        breakEligible,
      };
    });

    return NextResponse.json({ drivers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch drivers' },
      { status: 502 },
    );
  }
}
