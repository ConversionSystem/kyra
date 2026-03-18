import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/agency/build-requests/[id]
 * Update status or notes on a build request.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let body: { status?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status) {
    const valid = ['new', 'contacted', 'in_progress', 'completed', 'declined'];
    if (!valid.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes;
  }

  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('build_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[build-requests] Failed to update:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
