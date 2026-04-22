// ────────────────────────────────────────────────────────────────────────────
// POST /api/agency/clients/[id]/dispatch/briefing/[briefingId]/reject
//
// Body: { recommendationId: string, reason?: string }
//
// Marks the recommendation rejected in the briefing's recommendations array.
// Does NOT execute anything.
//
// Auth: requireClientAccess.
// ────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { requireClientAccess } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { CopilotRecommendation } from '@/lib/agents/copilot';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; briefingId: string }> },
) {
  const { id: clientId, briefingId } = await params;

  const auth = await requireClientAccess(clientId);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const body = await req.json().catch(() => ({}));
  const recommendationId = typeof body?.recommendationId === 'string' ? body.recommendationId : null;
  const reason = typeof body?.reason === 'string' ? body.reason : undefined;
  if (!recommendationId) {
    return NextResponse.json({ error: 'recommendationId is required' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Tenant guard — match client_id AND agency_id.
  const { data: briefing, error } = await supabase
    .from('dispatch_briefings')
    .select('id, client_id, agency_id, recommendations')
    .eq('id', briefingId)
    .eq('client_id', clientId)
    .eq('agency_id', auth.data.agency.id)
    .maybeSingle();

  if (error || !briefing) {
    return NextResponse.json({ error: 'Briefing not found' }, { status: 404 });
  }

  const recs: CopilotRecommendation[] = Array.isArray(briefing.recommendations)
    ? (briefing.recommendations as CopilotRecommendation[])
    : [];
  const idx = recs.findIndex((r) => r.id === recommendationId);
  if (idx < 0) {
    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
  }

  const rec = recs[idx];
  if (rec.approved) {
    return NextResponse.json({ error: 'Recommendation already approved' }, { status: 409 });
  }
  if (rec.rejected) {
    return NextResponse.json({ error: 'Recommendation already rejected' }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const updated: CopilotRecommendation[] = recs.map((r, i) =>
    i === idx
      ? { ...r, rejected: true, rejected_at: nowIso, reject_reason: reason }
      : r,
  );

  const { data: updatedRow, error: updateErr } = await supabase
    .from('dispatch_briefings')
    .update({ recommendations: updated })
    .eq('id', briefingId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ briefing: updatedRow });
}
