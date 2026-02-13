/**
 * Browser Control API
 *
 * Fetches and extracts web content using browseUrl.
 * Uses Cloudflare Browser Rendering when available, falls back to Readability.
 *
 * POST — Execute a browser action (navigate, extract, summarize)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Plan } from '@/lib/billing/plans';
import { browseUrl } from '@/lib/tools/browser-tool';

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

  const { action, url, selector } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  // Map API actions to browseUrl actions
  const browseAction = action === 'navigate' || action === 'summarize'
    ? 'read' as const
    : (action as 'read' | 'screenshot' | 'extract') || 'read' as const;

  const result = await browseUrl(url, {
    action: browseAction,
    selector,
    maxChars: 8000,
  });

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 502 }
    );
  }

  return NextResponse.json({
    title: result.title,
    content: result.content,
    url: result.url,
    screenshot: result.screenshot || null,
  });
}
