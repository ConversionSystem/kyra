/**
 * Run Now — trigger an immediate execution of an automation's OpenClaw cron job.
 *
 * POST /api/automations/:id/run
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { triggerOpenClawJob } from '@/lib/automations/executor';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: automation } = await serviceClient
    .from('automations')
    .select('openclaw_job_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!automation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!automation.openclaw_job_id) {
    return NextResponse.json(
      { error: 'Automation has no linked cron job yet' },
      { status: 400 },
    );
  }

  try {
    await triggerOpenClawJob(automation.openclaw_job_id);
  } catch (err) {
    console.error('OpenClaw trigger failed:', err);
    return NextResponse.json({ error: 'Failed to trigger job' }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
