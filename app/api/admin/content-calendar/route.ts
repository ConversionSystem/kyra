import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { Platform } from '@/lib/content/pillars';

const ADMIN_EMAILS = [
  'hello@conversionsystem.com',
  'angel@conversionsystem.com',
  'steve@conversionsystem.com',
  'webblex10@gmail.com',
];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) };
  }
  return { ok: true as const, user };
}

// Routines call this endpoint with a shared secret instead of a user session.
function hasRoutineSecret(req: NextRequest): boolean {
  const header = req.headers.get('authorization') || req.headers.get('x-routine-secret') || '';
  const secret = process.env.CONTENT_ROUTINE_SECRET;
  if (!secret) return false;
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : header;
  return bearer === secret;
}

/**
 * GET /api/admin/content-calendar
 * Query params:
 *   ?days=30              — how many days back to include (default 60)
 *   ?platform=linkedin    — filter by platform
 *   ?pillar=1             — filter by pillar
 *   ?status=draft         — filter by status
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok && !hasRoutineSecret(req)) return auth.response!;

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '60', 10);
  const platform = searchParams.get('platform') as Platform | null;
  const pillar = searchParams.get('pillar') ? parseInt(searchParams.get('pillar')!, 10) : null;
  const status = searchParams.get('status');

  const service = await createServiceClient();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString().slice(0, 10);

  let query = service
    .from('content_calendar')
    .select('*')
    .gte('scheduled_for', sinceISO)
    .order('scheduled_for', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);

  if (platform) query = query.eq('platform', platform);
  if (pillar) query = query.eq('pillar', pillar);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data || [] });
}

/**
 * POST /api/admin/content-calendar
 * Used by the routines to insert a new draft.
 * Body: { platform, pillar, pillar_name, angle, title, summary, content_url, pr_url,
 *         slug, cta_keyword, word_count, created_by, status? (default 'draft') }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok && !hasRoutineSecret(req)) return auth.response!;

  const body = await req.json();
  const today = new Date().toISOString().slice(0, 10);

  const required = ['platform', 'pillar', 'pillar_name', 'title'];
  for (const f of required) {
    if (!body[f]) return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 });
  }
  if (!['blog', 'linkedin', 'facebook', 'x'].includes(body.platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }
  if (typeof body.pillar !== 'number' || body.pillar < 1 || body.pillar > 7) {
    return NextResponse.json({ error: 'Invalid pillar' }, { status: 400 });
  }

  const service = await createServiceClient();

  const row = {
    scheduled_for: body.scheduled_for || today,
    platform: body.platform,
    pillar: body.pillar,
    pillar_name: body.pillar_name,
    angle: body.angle || null,
    status: body.status || 'draft',
    title: body.title,
    summary: body.summary || null,
    content_url: body.content_url || null,
    pr_url: body.pr_url || null,
    slug: body.slug || null,
    cta_keyword: body.cta_keyword || null,
    word_count: body.word_count || null,
    performance_notes: body.performance_notes || null,
    created_by: body.created_by || (auth.ok ? auth.user!.email : 'routine:unknown'),
  };

  const { data, error } = await service
    .from('content_calendar')
    .insert(row)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

/**
 * PATCH /api/admin/content-calendar?id=<uuid>
 * Update status, performance_notes, or content_url on an existing row.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok && !hasRoutineSecret(req)) return auth.response!;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();
  const allowed = ['status', 'performance_notes', 'content_url', 'pr_url', 'posted_at', 'title', 'summary'];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];

  // Auto-set posted_at when status flips to 'posted'
  if (patch.status === 'posted' && !patch.posted_at) {
    patch.posted_at = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from('content_calendar')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
