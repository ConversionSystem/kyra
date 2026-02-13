/**
 * Single Automation API
 * 
 * PATCH  — Update automation (enable/disable, edit)
 * DELETE — Delete automation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { cronToHuman } from '@/lib/automations/types';
import { updateOpenClawJob, deleteOpenClawJob } from '@/lib/automations/executor';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: existing } = await serviceClient
    .from('automations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const updates: any = { updated_at: new Date().toISOString() };

  if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;
  if (body.name) updates.name = body.name;
  if (body.schedule) updates.schedule = body.schedule;
  if (body.prompt) updates.prompt = body.prompt;
  if (body.delivery_channel) updates.delivery_channel = body.delivery_channel;

  const { data: updated, error: updateError } = await serviceClient
    .from('automations')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  // Sync changes to OpenClaw if the job exists
  if (existing.openclaw_job_id) {
    try {
      const patch: Record<string, unknown> = {};

      if (body.schedule || body.prompt || typeof body.enabled === 'boolean') {
        if (body.schedule) {
          patch.schedule = {
            kind: 'cron',
            expr: updated.schedule,
            tz: updated.timezone,
          };
        }
        if (body.prompt) {
          patch.payload = {
            kind: 'agentTurn',
            message: updated.prompt,
          };
        }
        if (typeof body.enabled === 'boolean') {
          patch.enabled = body.enabled;
        }

        await updateOpenClawJob(existing.openclaw_job_id, patch);
      }
    } catch (err) {
      console.error('OpenClaw update failed:', err);
    }
  }

  return NextResponse.json({
    automation: { ...updated, schedule_human: cronToHuman(updated.schedule) },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch to get openclaw_job_id before deleting
  const { data: existing } = await serviceClient
    .from('automations')
    .select('openclaw_job_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error: deleteError } = await serviceClient
    .from('automations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  // Remove from OpenClaw
  if (existing.openclaw_job_id) {
    try {
      await deleteOpenClawJob(existing.openclaw_job_id);
    } catch (err) {
      console.error('OpenClaw delete failed:', err);
    }
  }

  return NextResponse.json({ success: true });
}
