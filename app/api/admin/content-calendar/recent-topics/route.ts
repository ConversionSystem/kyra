import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { Platform } from '@/lib/content/pillars';

const ADMIN_EMAILS = [
  'hello@conversionsystem.com',
  'angel@conversionsystem.com',
  'steve@conversionsystem.com',
  'webblex10@gmail.com',
];

async function authed(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && ADMIN_EMAILS.includes(user.email || '')) return true;
  const header = req.headers.get('authorization') || req.headers.get('x-routine-secret') || '';
  const secret = process.env.CONTENT_ROUTINE_SECRET;
  if (secret) {
    const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : header;
    if (bearer === secret) return true;
  }
  return false;
}

/**
 * GET /api/admin/content-calendar/recent-topics?platform=linkedin&pillar=1&days=30
 *
 * Returns the angles + titles posted on the given (platform, pillar) combination
 * in the last N days. Routines call this BEFORE writing to avoid duplicating
 * an angle within the dedup window.
 */
export async function GET(req: NextRequest) {
  if (!await authed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform') as Platform | null;
  const pillar = searchParams.get('pillar') ? parseInt(searchParams.get('pillar')!, 10) : null;
  const days = parseInt(searchParams.get('days') || '30', 10);

  if (!platform) return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
  if (!pillar) return NextResponse.json({ error: 'Missing pillar' }, { status: 400 });

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString().slice(0, 10);

  const service = await createServiceClient();
  const { data, error } = await service
    .from('content_calendar')
    .select('angle, title, scheduled_for, cta_keyword')
    .eq('platform', platform)
    .eq('pillar', pillar)
    .gte('scheduled_for', sinceISO)
    .order('scheduled_for', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const anglesUsed = Array.from(new Set((data || []).map(r => r.angle).filter(Boolean)));
  const ctaKeywordsUsed = Array.from(new Set((data || []).map(r => r.cta_keyword).filter(Boolean)));

  return NextResponse.json({
    window_days: days,
    platform,
    pillar,
    total: data?.length || 0,
    angles_used: anglesUsed,
    cta_keywords_used: ctaKeywordsUsed,
    recent_titles: (data || []).map(r => ({
      title: r.title,
      scheduled_for: r.scheduled_for,
      angle: r.angle,
    })),
  });
}
