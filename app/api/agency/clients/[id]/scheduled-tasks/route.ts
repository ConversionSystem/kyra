import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireClientAccess } from '@/lib/agency/middleware';

export const dynamic = 'force-dynamic';

interface ScheduledTask {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  scheduleLabel: string;
  enabled: boolean;
  createdAt: string;
}

// PATCH — update scheduled tasks for a client
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const body = await req.json();
  const { scheduled_tasks } = body as { scheduled_tasks: ScheduledTask[] };

  if (!Array.isArray(scheduled_tasks)) {
    return NextResponse.json({ error: 'scheduled_tasks array required' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Get current client settings
  const { data: client, error: fetchError } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (fetchError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (client.settings as Record<string, unknown>) || {};

  const { error: updateError } = await supabase
    .from('agency_clients')
    .update({ settings: { ...settings, scheduled_tasks } })
    .eq('id', clientId)
    .eq('agency_id', auth.data.agency.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ scheduled_tasks });
}
