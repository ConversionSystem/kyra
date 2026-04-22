// ────────────────────────────────────────────────────────────────────────────
// POST /api/agency/clients/[id]/dispatch/briefing/[briefingId]/approve
//
// Body: { recommendationId: string }
//
// 1. Reads the briefing row.
// 2. Finds the matching recommendation in its JSONB array.
// 3. Marks it approved (approved: true, approved_at).
// 4. If `action` is a known tool name, executes it via buildToolExecutor with
//    full auto-execute permissions (low+medium+high) — the dispatcher's
//    explicit approval is the authority.
// 5. Writes back the updated recommendations[] and returns the row.
//
// Auth: requireClientAccess (agency member + client belongs to agency).
// ────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { requireClientAccess } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { createOnfleetClient } from '@/lib/onfleet/client';
import { buildToolExecutor, type ToolCatalogContext } from '@/lib/onfleet/tools';
import type { ClientDispatchConfig } from '@/lib/onfleet/types';
import type { CopilotRecommendation } from '@/lib/agents/copilot';

export const runtime = 'nodejs';

const KNOWN_ACTIONS = new Set([
  'assign_task',
  'update_deadline',
  'trigger_optimize',
  'send_customer_sms',
  'flag_sla_risk',
  'escalate_to_human',
]);

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
  if (!recommendationId) {
    return NextResponse.json({ error: 'recommendationId is required' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Tenant guard: match client_id (URL) AND agency_id (session) so a guessed
  // briefingId for another agency's client can't be approved.
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

  // ─── Execute the underlying action (if any) ────────────────────────────
  let executionResult: string | null = null;
  let executionError: string | null = null;

  if (rec.action && KNOWN_ACTIONS.has(rec.action)) {
    try {
      // Need the onfleet API key + agency_id
      const { data: clientRow } = await supabase
        .from('agency_clients')
        .select('settings')
        .eq('id', clientId)
        .single();

      const settings = (clientRow?.settings || {}) as Record<string, unknown>;
      const dispatch = settings.dispatch as Partial<ClientDispatchConfig> | undefined;

      if (!dispatch?.onfleetApiKey) {
        executionError = 'Onfleet API key not configured';
      } else {
        const toolCtx: ToolCatalogContext = {
          clientId,
          agencyId: briefing.agency_id,
          onfleet: createOnfleetClient(dispatch.onfleetApiKey),
          // Dispatcher has explicitly approved — bypass per-risk gate.
          autoExecuteRiskLevels: ['low', 'medium', 'high'],
          agent: 'copilot',
        };
        const { execute } = buildToolExecutor(toolCtx);
        const input = {
          ...(rec.toolInput ?? {}),
          reason:
            (rec.toolInput && typeof rec.toolInput.reason === 'string'
              ? String(rec.toolInput.reason)
              : `Approved by dispatcher: ${rec.text}`),
        };
        executionResult = await execute(rec.action, input);
      }
    } catch (err) {
      executionError = err instanceof Error ? err.message : String(err);
    }
  }

  // ─── Mark approved ──────────────────────────────────────────────────────
  const nowIso = new Date().toISOString();
  const updated: CopilotRecommendation[] = recs.map((r, i) =>
    i === idx ? { ...r, approved: true, approved_at: nowIso } : r,
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

  return NextResponse.json({
    briefing: updatedRow,
    execution: { result: executionResult, error: executionError },
  });
}
