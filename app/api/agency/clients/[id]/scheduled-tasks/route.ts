import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { scheduled_tasks } = body as { scheduled_tasks: ScheduledTask[] };

  if (!Array.isArray(scheduled_tasks)) {
    return NextResponse.json({ error: 'scheduled_tasks array required' }, { status: 400 });
  }

  // Get current client settings
  const { data: client, error: fetchError } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .single();

  if (fetchError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (client.settings as Record<string, unknown>) || {};

  const { error: updateError } = await supabase
    .from('agency_clients')
    .update({ settings: { ...settings, scheduled_tasks } })
    .eq('id', clientId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ scheduled_tasks });
}
