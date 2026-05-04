// ============================================================================
// POST /api/agency/knowledge/sync
//
// Syncs all enabled knowledge documents to the OpenClaw gateway as
// workspace/KNOWLEDGE_BASE.md, then wakes the AI so it re-reads on the next
// interaction. Bundle composition + push logic lives in
// `lib/knowledge/sync-to-gateway.ts` so the same code runs from the manual
// sync button, the doc-CRUD auto-triggers, and the client-provisioning path.
//
// Body: { clientId?: string } — when provided, sync targets that client's
// gateway. When omitted, falls back to the agency's primary gateway.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { getGatewayByClientId, getGatewayByAgencyId } from '@/lib/ovh/gateway-resolver';
import {
  loadKnowledgeForAgency,
  loadKnowledgeForClient,
  pushKnowledgeToGateway,
  markSynced,
} from '@/lib/knowledge/sync-to-gateway';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const body = await request.json().catch(() => ({}));
  const clientId = (body.clientId as string | undefined) || request.nextUrl.searchParams.get('clientId') || undefined;

  const gateway = clientId
    ? await getGatewayByClientId(clientId)
    : await getGatewayByAgencyId(agency.id);

  if (!gateway) {
    return NextResponse.json({ error: 'Gateway not provisioned. Deploy a client AI first.' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // When the caller targeted a specific client, scope the bundle to that
  // client (agency-wide + client-scoped docs only). Otherwise ship the full
  // agency bundle — preserves the existing /sync behaviour.
  const bundle = clientId
    ? await loadKnowledgeForClient(supabase, agency.id, clientId)
    : await loadKnowledgeForAgency(supabase, agency.id);

  if (bundle.documentCount === 0) {
    return NextResponse.json({ synced: 0, message: 'No documents to sync' });
  }

  const push = await pushKnowledgeToGateway(gateway, bundle, { wakeAi: true });
  if (!push.ok) {
    console.error('[knowledge/sync] Gateway push failed:', push.error);
    return NextResponse.json({ error: push.error }, { status: 500 });
  }

  await markSynced(supabase, bundle.documentIds);

  return NextResponse.json({
    synced: bundle.documentCount,
    totalChars: bundle.totalChars,
    gatewayWriteOk: true,
  });
}
