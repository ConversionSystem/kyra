/**
 * Automations API
 * 
 * GET  — List user's automations
 * POST — Create a new automation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { v4 as uuid } from 'uuid';
import { cronToHuman } from '@/lib/automations/types';
import { syncAutomationToOpenClaw } from '@/lib/automations/executor';

export async function GET() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: automations, error: fetchError } = await serviceClient
    .from('automations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 });
  }

  return NextResponse.json({
    automations: (automations || []).map((a: any) => ({
      ...a,
      schedule_human: cronToHuman(a.schedule),
    })),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check plan allows automations
  const { data: profile } = await serviceClient
    .from('users')
    .select('plan, timezone')
    .eq('id', user.id)
    .single();

  const plan = profile?.plan || 'free';
  if (plan === 'free') {
    return NextResponse.json(
      { error: 'Upgrade to Starter to use automations' },
      { status: 403 }
    );
  }

  // Plan limits
  const maxAutomations: Record<string, number> = {
    starter: 3,
    business: 10,
    max: 50,
  };

  const { count } = await serviceClient
    .from('automations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const limit = maxAutomations[plan] || 3;
  if ((count || 0) >= limit) {
    return NextResponse.json(
      { error: `You can have up to ${limit} automations on your ${plan} plan` },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, schedule, prompt, delivery_channel, timezone } = body;

  if (!name || !schedule || !prompt) {
    return NextResponse.json({ error: 'name, schedule, and prompt are required' }, { status: 400 });
  }

  // Validate cron expression (basic check)
  const cronParts = schedule.split(' ');
  if (cronParts.length !== 5) {
    return NextResponse.json({ error: 'Invalid cron schedule' }, { status: 400 });
  }

  const id = uuid();
  const tz = timezone || profile?.timezone || 'UTC';

  const { data: automation, error: insertError } = await serviceClient
    .from('automations')
    .insert({
      id,
      user_id: user.id,
      name,
      schedule,
      prompt,
      delivery_channel: delivery_channel || 'web',
      timezone: tz,
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create automation:', insertError);
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 });
  }

  // Sync to OpenClaw cron engine
  try {
    const jobId = await syncAutomationToOpenClaw({
      name,
      schedule,
      timezone: tz,
      prompt,
    });

    await serviceClient
      .from('automations')
      .update({ openclaw_job_id: jobId })
      .eq('id', id);

    automation.openclaw_job_id = jobId;
  } catch (err) {
    console.error('OpenClaw sync failed (automation created without job):', err);
  }

  return NextResponse.json({
    automation: {
      ...automation,
      schedule_human: cronToHuman(schedule),
    },
  });
}
