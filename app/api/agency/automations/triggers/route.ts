/**
 * GET  /api/agency/automations/triggers — list event triggers for this agency
 * PATCH /api/agency/automations/triggers — create/update a trigger
 * DELETE /api/agency/automations/triggers?id=xxx — remove a trigger
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { syncAutomationsToAllClients } from '@/lib/automations/sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAgencyAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const agencyId = auth.data.agency.id;
  const supabase = createServiceClientWithoutCookies();
  const { data: agency } = await supabase
    .from('agencies').select('settings').eq('id', agencyId).single();

  const settings = (agency?.settings as Record<string, unknown>) ?? {};
  const triggers = (settings.event_triggers as Record<string, unknown>) ?? {};
  return NextResponse.json({ triggers });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAgencyAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const agencyId = auth.data.agency.id;
  const { id, event, enabled, action, delay } = await req.json();
  if (!id || !event) return NextResponse.json({ error: 'id and event required' }, { status: 400 });

  const supabase = createServiceClientWithoutCookies();
  const { data: agency } = await supabase
    .from('agencies').select('settings').eq('id', agencyId).single();

  const settings = (agency?.settings as Record<string, unknown>) ?? {};
  const triggers = { ...((settings.event_triggers as Record<string, unknown>) ?? {}) };
  const existing = triggers[id] as Record<string, unknown> | undefined;

  triggers[id] = {
    id, event,
    enabled: enabled ?? false,
    action: action ?? '',
    delay: delay ?? 0,
    totalFired: existing?.totalFired ?? 0,
    lastFired: existing?.lastFired ?? null,
  };

  const { error } = await supabase
    .from('agencies')
    .update({ settings: { ...settings, event_triggers: triggers } })
    .eq('id', agencyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync to all client containers (fire-and-forget)
  syncAutomationsToAllClients(agencyId).catch((err) => {
    console.error('[automations/triggers] Sync to containers failed:', err);
  });

  return NextResponse.json({ ok: true, trigger: triggers[id] });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAgencyAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const agencyId = auth.data.agency.id;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createServiceClientWithoutCookies();
  const { data: agency } = await supabase
    .from('agencies').select('settings').eq('id', agencyId).single();

  const settings = (agency?.settings as Record<string, unknown>) ?? {};
  const triggers = { ...((settings.event_triggers as Record<string, unknown>) ?? {}) };
  delete triggers[id];

  const { error: deleteError } = await supabase
    .from('agencies')
    .update({ settings: { ...settings, event_triggers: triggers } })
    .eq('id', agencyId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  // Sync to all client containers (fire-and-forget)
  syncAutomationsToAllClients(agencyId).catch((err) => {
    console.error('[automations/triggers] Sync to containers failed:', err);
  });

  return NextResponse.json({ ok: true });
}
