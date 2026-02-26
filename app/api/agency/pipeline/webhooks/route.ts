/**
 * /api/agency/pipeline/webhooks — CRUD for pipeline webhook configurations
 * 
 * GET:    List all webhooks for the agency
 * POST:   Create a new webhook
 * PATCH:  Update a webhook (pass id in body)
 * DELETE: Delete a webhook (pass id in body)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { testWebhook } from '@/lib/pipeline/webhooks';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

// ─── GET: List webhooks ───────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const svc = createServiceClientWithoutCookies();
  const { data: webhooks, error } = await svc
    .from('pipeline_webhooks')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ webhooks: webhooks || [] });
}

// ─── POST: Create webhook ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const { name, url, events, headers: customHeaders, secret, test } = body;

  // Test mode — just test the URL
  if (test && url) {
    const result = await testWebhook(url, secret);
    return NextResponse.json(result);
  }

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!url?.trim()) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  if (!events?.length) return NextResponse.json({ error: 'At least one event is required' }, { status: 400 });

  // Validate URL
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const svc = createServiceClientWithoutCookies();
  const { data: webhook, error } = await svc.from('pipeline_webhooks').insert({
    agency_id: agencyId,
    name: name.trim(),
    url: url.trim(),
    events: events || [],
    headers: customHeaders || {},
    secret: secret || null,
    is_active: true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ webhook });
}

// ─── PATCH: Update webhook ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Webhook id required' }, { status: 400 });

  const allowedFields = ['name', 'url', 'events', 'headers', 'secret', 'is_active'];
  const safeUpdates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) safeUpdates[field] = updates[field];
  }

  if (safeUpdates.url) {
    try { new URL(safeUpdates.url as string); } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
  }

  const svc = createServiceClientWithoutCookies();
  const { data: webhook, error } = await svc
    .from('pipeline_webhooks')
    .update(safeUpdates)
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ webhook });
}

// ─── DELETE: Remove webhook ───────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Webhook id required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();
  const { error } = await svc
    .from('pipeline_webhooks')
    .delete()
    .eq('id', id)
    .eq('agency_id', agencyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
