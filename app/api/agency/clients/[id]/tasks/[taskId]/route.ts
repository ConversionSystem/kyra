/**
 * GET    /api/agency/clients/[id]/tasks/[taskId] — Get task details with recent runs
 * PATCH  /api/agency/clients/[id]/tasks/[taskId] — Update task
 * DELETE /api/agency/clients/[id]/tasks/[taskId] — Delete task
 * POST   /api/agency/clients/[id]/tasks/[taskId] — Manual trigger (body: { action: 'run' })
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeTask } from '@/lib/tasks/task-executor';
import { getNextCronRun } from '@/lib/tasks/cron-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteParams = { params: Promise<{ id: string; taskId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id: clientId, taskId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: task, error: taskError } = await supabase
    .from('worker_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('client_id', clientId)
    .single();

  if (taskError || !task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  // Get recent runs (last 20)
  const { data: runs } = await supabase
    .from('worker_task_runs')
    .select('*')
    .eq('task_id', taskId)
    .order('started_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ task, runs: runs ?? [] });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id: clientId, taskId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  // Allow updating specific fields
  const allowedFields = [
    'name', 'description', 'task_type', 'trigger_type', 'schedule_cron',
    'event_type', 'worker_role', 'custom_prompt', 'max_tokens',
    'timeout_seconds', 'enabled',
  ];

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  // Recalculate next_run_at if schedule changed
  if ('schedule_cron' in updates || 'enabled' in updates || 'trigger_type' in updates) {
    const scheduleCron = (updates.schedule_cron as string) ?? body.schedule_cron;
    const enabled = (updates.enabled as boolean) ?? true;
    const triggerType = (updates.trigger_type as string) ?? body.trigger_type ?? 'schedule';

    if (triggerType === 'schedule' && scheduleCron && enabled) {
      const nextRun = getNextCronRun(scheduleCron);
      updates.next_run_at = nextRun?.toISOString() ?? null;
    } else {
      updates.next_run_at = null;
    }
  }

  updates.updated_at = new Date().toISOString();

  const { data: task, error } = await supabase
    .from('worker_tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  return NextResponse.json({ task });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id: clientId, taskId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('worker_tasks')
    .delete()
    .eq('id', taskId)
    .eq('client_id', clientId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: clientId, taskId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (body.action !== 'run') {
    return NextResponse.json({ error: 'Invalid action. Use { action: "run" }' }, { status: 400 });
  }

  // Verify task belongs to this client
  const { data: task } = await supabase
    .from('worker_tasks')
    .select('id')
    .eq('id', taskId)
    .eq('client_id', clientId)
    .single();

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const result = await executeTask(taskId);

  return NextResponse.json({
    success: result.success,
    run_id: result.runId,
    summary: result.summary,
    error: result.error,
  });
}
