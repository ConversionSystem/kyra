/**
 * GET  /api/agency/clients/[id]/tasks — List all tasks for a client
 * POST /api/agency/clients/[id]/tasks — Create a new task
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireClientAccess } from '@/lib/agency/middleware';
import { getNextCronRun } from '@/lib/tasks/cron-utils';
import type { TaskType, TriggerType } from '@/lib/tasks/task-types';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const svc = createServiceClientWithoutCookies();
  const { data: tasks, error } = await svc
    .from('worker_tasks')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tasks: tasks ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const body = await req.json();
  const {
    name,
    description,
    task_type,
    trigger_type,
    schedule_cron,
    event_type,
    worker_role,
    custom_prompt,
    max_tokens,
    timeout_seconds,
    enabled,
  } = body as {
    name: string;
    description?: string;
    task_type: TaskType;
    trigger_type: TriggerType;
    schedule_cron?: string;
    event_type?: string;
    worker_role: string;
    custom_prompt?: string;
    max_tokens?: number;
    timeout_seconds?: number;
    enabled?: boolean;
  };

  if (!name || !task_type || !trigger_type || !worker_role) {
    return NextResponse.json(
      { error: 'Missing required fields: name, task_type, trigger_type, worker_role' },
      { status: 400 }
    );
  }

  // Calculate next_run_at for scheduled tasks
  let next_run_at: string | null = null;
  if (trigger_type === 'schedule' && schedule_cron) {
    const nextRun = getNextCronRun(schedule_cron);
    next_run_at = nextRun?.toISOString() ?? null;
  }

  const svc = createServiceClientWithoutCookies();
  const { data: task, error } = await svc
    .from('worker_tasks')
    .insert({
      client_id: clientId,
      agency_id: auth.data.client.agency_id,
      name,
      description: description ?? null,
      task_type,
      trigger_type,
      schedule_cron: schedule_cron ?? null,
      event_type: event_type ?? null,
      worker_role,
      custom_prompt: custom_prompt ?? null,
      max_tokens: max_tokens ?? 4000,
      timeout_seconds: timeout_seconds ?? 120,
      enabled: enabled ?? true,
      next_run_at,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ task }, { status: 201 });
}
