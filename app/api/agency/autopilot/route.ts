import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getSchedule,
  weeklyOverview,
  type AutopilotAction,
} from '@/lib/autopilot/autopilot-engine';

export const dynamic = 'force-dynamic';

// GET — current autopilot schedule + stats
export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: membership } = await sb
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { data: agency } = await sb
    .from('agencies')
    .select('settings')
    .eq('id', membership.agency_id)
    .single();

  const settings = (agency?.settings ?? {}) as Record<string, unknown>;
  const savedActions = settings.autopilot_schedule as AutopilotAction[] | undefined;
  const autopilotEnabled = settings.autopilot_enabled === true;

  const schedule = getSchedule(savedActions);
  const overview = weeklyOverview(schedule);

  // Stats from execution log
  const actionsRun = (settings.autopilot_actions_run as number) ?? 0;
  const lastRunAt = (settings.autopilot_last_run as string) ?? null;

  return NextResponse.json({
    enabled: autopilotEnabled,
    schedule,
    overview,
    stats: {
      actionsRun,
      lastRunAt,
      enabledCount: schedule.filter(a => a.enabled).length,
      totalCount: schedule.length,
    },
  });
}

// POST — update schedule or toggle autopilot
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: membership } = await sb
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  const { data: agency } = await sb
    .from('agencies')
    .select('settings')
    .eq('id', membership.agency_id)
    .single();

  const settings = (agency?.settings ?? {}) as Record<string, unknown>;

  if (action === 'toggle') {
    const { enabled } = body;
    await sb
      .from('agencies')
      .update({ settings: { ...settings, autopilot_enabled: enabled } })
      .eq('id', membership.agency_id);
    return NextResponse.json({ success: true, enabled });
  }

  if (action === 'update_action') {
    const { actionData } = body as { actionData: AutopilotAction };
    const current = (settings.autopilot_schedule ?? []) as AutopilotAction[];
    const idx = current.findIndex(a => a.id === actionData.id);
    if (idx >= 0) {
      current[idx] = actionData;
    } else {
      current.push(actionData);
    }
    await sb
      .from('agencies')
      .update({ settings: { ...settings, autopilot_schedule: current } })
      .eq('id', membership.agency_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'toggle_action') {
    const { actionId, enabled } = body;
    const schedule = getSchedule(settings.autopilot_schedule as AutopilotAction[] | undefined);
    const updated = schedule.map(a => a.id === actionId ? { ...a, enabled } : a);
    await sb
      .from('agencies')
      .update({ settings: { ...settings, autopilot_schedule: updated } })
      .eq('id', membership.agency_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'add_custom') {
    const { actionData } = body as { actionData: AutopilotAction };
    const current = (settings.autopilot_schedule ?? getSchedule()) as AutopilotAction[];
    current.push({ ...actionData, id: `custom-${Date.now()}` });
    await sb
      .from('agencies')
      .update({ settings: { ...settings, autopilot_schedule: current } })
      .eq('id', membership.agency_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'delete_action') {
    const { actionId } = body;
    const current = (settings.autopilot_schedule ?? []) as AutopilotAction[];
    const filtered = current.filter(a => a.id !== actionId);
    await sb
      .from('agencies')
      .update({ settings: { ...settings, autopilot_schedule: filtered } })
      .eq('id', membership.agency_id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
