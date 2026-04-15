import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runOptimization } from '@/lib/onfleet/route-optimizer';
import type { ClientDispatchConfig } from '@/lib/onfleet/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Dispatch Auto-Optimization Cron
 *
 * Runs every 15 minutes (configured via Vercel cron or external trigger).
 * Finds all clients with dispatch enabled + autoOptimize = true,
 * then runs route optimization for each.
 *
 * Vercel cron config: see vercel.json (every 15 minutes)
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find all clients with dispatch enabled
  const { data: clients, error } = await supabase
    .from('agency_clients')
    .select('id, settings')
    .not('settings', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ clientId: string; success: boolean; tasksProcessed: number }> = [];

  for (const client of clients || []) {
    const settings = (client.settings || {}) as Record<string, unknown>;
    const dispatch = settings.dispatch as ClientDispatchConfig | undefined;

    // Skip if dispatch not enabled or auto-optimize off or no API key
    if (!dispatch?.enabled || !dispatch?.autoOptimize || !dispatch?.onfleetApiKey) {
      continue;
    }

    try {
      const result = await runOptimization(client.id, dispatch);

      // Log events
      for (const event of result.events) {
        await supabase.from('dispatch_events').insert({
          client_id: event.client_id,
          event_type: event.event_type,
          details: event.details,
          tasks_affected: event.tasks_affected,
          workers_affected: event.workers_affected,
        }).then(() => {});
      }

      results.push({
        clientId: client.id,
        success: result.success,
        tasksProcessed: result.tasksProcessed,
      });
    } catch (err) {
      results.push({
        clientId: client.id,
        success: false,
        tasksProcessed: 0,
      });
    }
  }

  return NextResponse.json({
    status: 'completed',
    clientsProcessed: results.length,
    results,
  });
}
