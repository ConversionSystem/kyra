// ============================================================================
// /api/agency/automations
//
// CRUD for Kyra automations stored in agency settings JSONB.
// Automations are stored as agency.settings.automations[] and executed
// by the pipeline's follow-up engine or heartbeat system.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { v4 as uuid } from 'uuid';
import { syncAutomationsToAllClients } from '@/lib/automations/sync';

export const dynamic = 'force-dynamic';

interface Automation {
  id: string;
  name: string;
  schedule: Record<string, unknown>;
  task: string;
  enabled: boolean;
  lastRun: string | null;
  createdAt: string;
}

async function getAutomations(agencyId: string): Promise<Automation[]> {
  const sb = await createClient();
  const { data: agency } = await sb
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();
  const settings = (agency?.settings ?? {}) as Record<string, unknown>;
  return ((settings.automations ?? []) as Automation[]);
}

async function saveAutomations(agencyId: string, automations: Automation[]): Promise<boolean> {
  const sb = await createClient();
  const { data: agency } = await sb
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();
  const settings = (agency?.settings ?? {}) as Record<string, unknown>;
  settings.automations = automations;
  const { error } = await sb
    .from('agencies')
    .update({ settings })
    .eq('id', agencyId);
  return !error;
}

// GET — List all automations
export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  const { agency } = result.data;
  const jobs = await getAutomations(agency.id);
  return NextResponse.json({ jobs });
}

// POST — Create a new automation
export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  const { agency } = result.data;
  const body = await request.json();

  if (!body.name || !body.schedule || !body.task) {
    return NextResponse.json({ error: 'Missing required fields: name, schedule, task' }, { status: 400 });
  }

  const jobs = await getAutomations(agency.id);
  const newJob: Automation = {
    id: uuid(),
    name: body.name,
    schedule: parseSchedule(body.schedule, body.scheduleValue, body.timezone),
    task: body.task,
    enabled: body.enabled !== false,
    lastRun: null,
    createdAt: new Date().toISOString(),
  };
  jobs.push(newJob);
  const ok = await saveAutomations(agency.id, jobs);
  if (!ok) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });

  // Sync to all client containers (fire-and-forget)
  syncAutomationsToAllClients(agency.id).catch((err) => {
    console.error('[automations] Sync to containers failed:', err);
  });

  return NextResponse.json({ success: true, job: newJob });
}

// PATCH — Update an existing automation
export async function PATCH(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  const { agency } = result.data;
  const body = await request.json();
  if (!body.jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

  const jobs = await getAutomations(agency.id);
  const idx = jobs.findIndex(j => j.id === body.jobId);
  if (idx === -1) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  if (body.name !== undefined) jobs[idx].name = body.name;
  if (body.enabled !== undefined) jobs[idx].enabled = body.enabled;
  if (body.task !== undefined) jobs[idx].task = body.task;
  if (body.schedule !== undefined) {
    jobs[idx].schedule = parseSchedule(body.schedule, body.scheduleValue, body.timezone);
  }

  const ok = await saveAutomations(agency.id, jobs);
  if (!ok) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });

  // Sync to all client containers (fire-and-forget)
  syncAutomationsToAllClients(agency.id).catch((err) => {
    console.error('[automations] Sync to containers failed:', err);
  });

  return NextResponse.json({ success: true, job: jobs[idx] });
}

// DELETE — Remove an automation
export async function DELETE(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  const { agency } = result.data;
  const jobId = new URL(request.url).searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

  let jobs = await getAutomations(agency.id);
  jobs = jobs.filter(j => j.id !== jobId);
  const ok = await saveAutomations(agency.id, jobs);
  if (!ok) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });

  // Sync to all client containers (fire-and-forget)
  syncAutomationsToAllClients(agency.id).catch((err) => {
    console.error('[automations] Sync to containers failed:', err);
  });

  return NextResponse.json({ success: true });
}

// ── Helpers ──────────────────────────────────────────────────────────────

function parseSchedule(type: string, value: string, timezone?: string): Record<string, unknown> {
  switch (type) {
    case 'cron':
      return { kind: 'cron', expr: value, tz: timezone || 'UTC' };
    case 'every': {
      const match = value.match(/^(\d+)(s|m|h|d)$/);
      if (!match) return { kind: 'cron', expr: value, tz: timezone || 'UTC' };
      const num = parseInt(match[1]);
      const unit = match[2];
      const ms = num * ({ s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] || 60000);
      return { kind: 'every', everyMs: ms };
    }
    case 'at':
      return { kind: 'at', at: value };
    default:
      return { kind: 'cron', expr: value || '0 9 * * *', tz: timezone || 'UTC' };
  }
}
