/**
 * GET  /api/voice/retell/calls — List calls for a client
 * POST /api/voice/retell/calls — Create outbound call
 *
 * GET params: ?clientId=xxx&limit=20
 * POST body: { clientId, toNumber }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import {
  createPhoneCall,
  createWebCall,
  listCalls,
  hasRetellKey,
} from '@/lib/voice/retell';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  if (!hasRetellKey()) return NextResponse.json({ error: 'Retell AI not configured' }, { status: 503 });

  const clientId = request.nextUrl.searchParams.get('clientId');
  const limit = Number(request.nextUrl.searchParams.get('limit')) || 20;

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();
  const { data: client } = await svc
    .from('agency_clients')
    .select('container_config')
    .eq('id', clientId)
    .single();

  const voiceConfig = ((client?.container_config as Record<string, unknown>)?.voice_config as Record<string, unknown>) ?? {};
  const agentId = voiceConfig.retell_agent_id as string | undefined;

  if (!agentId) return NextResponse.json({ calls: [] });

  try {
    const calls = await listCalls({ agent_id: agentId, limit, sort_order: 'descending' });
    return NextResponse.json({ calls });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  if (!hasRetellKey()) return NextResponse.json({ error: 'Retell AI not configured' }, { status: 503 });

  const body = await request.json();
  const { clientId, toNumber, webCall } = body;

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();
  const { data: client } = await svc
    .from('agency_clients')
    .select('id, name, container_config')
    .eq('id', clientId)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const voiceConfig = ((client.container_config as Record<string, unknown>)?.voice_config as Record<string, unknown>) ?? {};
  const agentId = voiceConfig.retell_agent_id as string;
  const fromNumber = voiceConfig.phone_number as string;

  if (!agentId) return NextResponse.json({ error: 'No Retell agent configured' }, { status: 400 });

  try {
    if (webCall) {
      // Browser-based call (no phone number needed)
      const result = await createWebCall({
        agent_id: agentId,
        metadata: { kyra_client_id: clientId },
      });
      return NextResponse.json({ ok: true, ...result }, { status: 201 });
    }

    // Phone call
    if (!toNumber) return NextResponse.json({ error: 'toNumber required for phone calls' }, { status: 400 });
    if (!fromNumber) return NextResponse.json({ error: 'No phone number assigned. Buy one first.' }, { status: 400 });

    const call = await createPhoneCall({
      from_number: fromNumber,
      to_number: toNumber,
      override_agent_id: agentId,
      metadata: { kyra_client_id: clientId },
    });

    return NextResponse.json({ ok: true, call_id: call.call_id }, { status: 201 });
  } catch (err) {
    console.error('[retell/calls POST]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
