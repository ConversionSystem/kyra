/**
 * Browser Control API
 * 
 * Proxies browser actions to the user's OpenClaw session.
 * Uses Cloudflare Browser Rendering when available, falls back to web_fetch.
 * 
 * POST — Execute a browser action (navigate, screenshot, extract)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Plan } from '@/lib/billing/plans';
import { sessionsSend, getOrCreateSession, markContextInjected } from '@/lib/openclaw/sessions';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check plan allows browser
  const { data: profile } = await serviceClient
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single();

  const plan = (profile?.plan || 'free') as Plan;
  if (!['business', 'max'].includes(plan)) {
    return NextResponse.json(
      { error: 'Browser control requires Business or Max plan' },
      { status: 403 }
    );
  }

  // Check skill is enabled
  const { data: skillEnabled } = await serviceClient
    .from('user_skills')
    .select('enabled')
    .eq('user_id', user.id)
    .eq('skill_id', 'browser')
    .single();

  if (!skillEnabled?.enabled) {
    return NextResponse.json(
      { error: 'Enable the Browser Control skill in Settings > Skills first' },
      { status: 403 }
    );
  }

  const { action, url, selector, instructions } = await request.json();

  if (!action) {
    return NextResponse.json({ error: 'action required' }, { status: 400 });
  }

  // Route browser commands through OpenClaw session
  const { session } = getOrCreateSession(user.id);

  let prompt: string;
  switch (action) {
    case 'navigate':
      prompt = `Navigate to ${url} and summarize what you see on the page.`;
      break;
    case 'screenshot':
      prompt = `Take a screenshot of ${url} and describe what's visible.`;
      break;
    case 'extract':
      prompt = `Go to ${url} and extract the following: ${instructions || selector || 'main content'}`;
      break;
    case 'fill':
      prompt = `Go to ${url} and ${instructions}`;
      break;
    default:
      prompt = instructions || `Perform browser action: ${action} on ${url}`;
  }

  const result = await sessionsSend(session.sessionKey, prompt, 60);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Browser action failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ result: result.content });
}
