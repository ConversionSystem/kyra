// ============================================================================
// POST /api/admin/sync-client-model
//
// Idempotent in-place sync of a client's container to a target model.
// Updates agency_clients.ai_model in the DB AND triggers the provisioner's
// /containers/<id>/update-tier endpoint to apply the new model to the
// running container (no destroy / recreate — preserves all session state).
//
// Built 2026-05-13 after finding TrustedNetworx + MIX Networks containers
// had drifted from their DB ai_model values, with no UI path to sync the
// existing container without a full reprovision. This endpoint is the
// "make the running container match the DB" admin tool.
//
// Auth: shared secret in the OVH_PROVISIONER_SECRET env var (same secret
// the provisioner already validates between Kyra and the OVH VPS). Sent
// as `Authorization: Bearer <secret>` or `X-Admin-Secret: <secret>` header.
//
// Body:
//   { clientId: string, model: string }
//
// Response:
//   { ok: true, dbUpdated: true, containerSynced: true|false, error?: string }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { updateContainerTier } from '@/lib/ovh/provisioner';
import { getRouterTierForModel } from '@/lib/billing/model-credits';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function POST(request: NextRequest) {
  // Auth via shared secret — same one the OVH provisioner validates.
  const secret = process.env.OVH_PROVISIONER_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'admin sync disabled (no secret configured)' }, { status: 503 });
  }
  const provided =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    request.headers.get('x-admin-secret') || '';
  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { clientId?: string; model?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 }); }

  const clientId = (body.clientId || '').trim();
  const model = (body.model || '').trim();
  if (!clientId || !model) {
    return NextResponse.json({ ok: false, error: 'clientId and model required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Verify the client exists + grab its gateway state for the report
  const { data: client, error: lookupErr } = await supabase
    .from('agency_clients')
    .select('id, name, ai_model, gateway_status')
    .eq('id', clientId)
    .single();
  if (lookupErr || !client) {
    return NextResponse.json({ ok: false, error: 'client not found' }, { status: 404 });
  }

  // 1. Update DB ai_model
  const { error: updateErr } = await supabase
    .from('agency_clients')
    .update({ ai_model: model, updated_at: new Date().toISOString() })
    .eq('id', clientId);
  if (updateErr) {
    return NextResponse.json({ ok: false, error: `DB update failed: ${updateErr.message}` }, { status: 500 });
  }

  // 2. Trigger in-place container sync via provisioner. The provisioner's
  //    /update-tier endpoint writes the new model to openclaw.json + sets
  //    KYRA_MAX_TIER and restarts the container with fresh API keys
  //    (platform OpenRouter key for non-BYOK agencies). NO destroy/recreate.
  const maxTier = getRouterTierForModel(model);
  const sync = await updateContainerTier(clientId, maxTier, model);

  console.log(
    `[admin/sync-client-model] ${clientId.slice(0, 8)} (${client.name}) ` +
    `${client.ai_model || '(none)'} → ${model} | sync=${sync.ok ? 'OK' : 'FAIL: ' + sync.error}`,
  );

  return NextResponse.json({
    ok: true,
    clientId,
    name: client.name,
    previousModel: client.ai_model,
    newModel: model,
    gatewayStatus: client.gateway_status,
    dbUpdated: true,
    containerSynced: sync.ok,
    syncError: sync.ok ? undefined : sync.error,
  });
}
