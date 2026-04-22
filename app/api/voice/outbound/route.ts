// POST /api/voice/outbound — Trigger an AI outbound call
// Used for: missed call follow-up, lead re-engagement, appointment reminders

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember, requireClientAccess } from '@/lib/agency/middleware';
import { getVoiceProvider, buildVoiceConfig } from '@/lib/voice/provider';
import type { VoiceProvider } from '@/lib/voice/types';

export async function POST(req: NextRequest) {
  const { clientId, toNumber, customerName, context } = await req.json();
  if (!clientId || !toNumber) {
    return NextResponse.json({ error: 'clientId and toNumber required' }, { status: 400 });
  }

  // Tenant-scope check: caller must be a member of the agency that owns the
  // target clientId. Previously this route only called
  // `supabase.auth.getUser()` — any logged-in Kyra user could POST with
  // ANOTHER agency's clientId and initiate calls, burning their credits
  // and dialing arbitrary numbers. Chains with the public client-UUID
  // exposure at /api/public/workers.
  //
  // Two paths exist because `clientId` can be either:
  //   (a) an agency_clients.id (the normal case), or
  //   (b) an agencies.id (agency-level voice / solo-plan fallback)
  // We try (a) first via requireClientAccess. On 404, fall back to (b) by
  // requiring the caller IS a member of the agency with that id.
  let callerAgencyId: string;
  let client: { id: string; name: string; container_config: unknown; agency_id: string } | null = null;
  let cfg: Record<string, unknown> = {};

  const clientAuth = await requireClientAccess(clientId);
  const svc = createServiceClientWithoutCookies();

  if (clientAuth.error?.status === 404) {
    // Path (b): clientId IS the agency.id — agency-level voice.
    const memberAuth = await requireAgencyMember();
    if (memberAuth.error) {
      return NextResponse.json({ error: memberAuth.error.message }, { status: memberAuth.error.status });
    }
    if (memberAuth.data.agency.id !== clientId) {
      return NextResponse.json({ error: 'You do not have access to this client' }, { status: 403 });
    }
    callerAgencyId = memberAuth.data.agency.id;
    const { data: agencyRow } = await svc
      .from('agencies')
      .select('id, name, settings')
      .eq('id', clientId)
      .single();
    if (!agencyRow) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    client = {
      id: agencyRow.id,
      name: agencyRow.name,
      container_config: agencyRow.settings,
      agency_id: agencyRow.id,
    };
    cfg = (agencyRow.settings as Record<string, unknown>) ?? {};
  } else if (clientAuth.error) {
    return NextResponse.json({ error: clientAuth.error.message }, { status: clientAuth.error.status });
  } else {
    // Path (a): clientId is an agency_clients.id — normal case.
    callerAgencyId = clientAuth.data.agency.id;
    const { data: clientRow } = await svc
      .from('agency_clients')
      .select('id, name, container_config, agency_id')
      .eq('id', clientId)
      .single();
    if (!clientRow) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    client = clientRow;
    cfg = (client.container_config as Record<string, unknown>) ?? {};
  }

  // Sanity: callerAgencyId matched above, but keep this narrow check to
  // avoid passing null through the rest of the handler.
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  void callerAgencyId;

  const voiceConfig = (cfg.voice_config as Record<string, string>) ?? {};

  const isKyraNative = voiceConfig.provider === 'openclaw';
  if (!voiceConfig.enabled || (!isKyraNative && !voiceConfig.apiKey)) {
    return NextResponse.json({ error: 'Voice not configured for this client' }, { status: 400 });
  }

  const providerClient = getVoiceProvider(voiceConfig.provider as VoiceProvider, voiceConfig.apiKey);

  // Build a context-aware assistant config for this outbound call
  const assistantConfig = buildVoiceConfig({
    name: client.name,
    aiName: voiceConfig.aiName ?? 'Alex',
    persona: cfg.persona as string | undefined,
    industry: cfg.industry as string | undefined,
  });

  // For outbound, customize the first message to be more natural
  if (context) {
    assistantConfig.firstMessage = `Hi${customerName ? ` ${customerName}` : ''}! This is ${voiceConfig.aiName ?? 'Alex'} calling from ${client.name}. ${context} Do you have a moment?`;
  }

  const { callId } = await providerClient.startOutboundCall(
    { clientId, toNumber, customerName, context },
    {
      provider: voiceConfig.provider as VoiceProvider,
      apiKey: voiceConfig.apiKey,
      phoneNumberId: voiceConfig.phoneNumberId,
      phoneNumber: voiceConfig.phoneNumber,
      assistantId: voiceConfig.assistantId,
    },
    assistantConfig
  );

  // Log the outbound call attempt
  await svc.from('client_conversations').insert({
    client_id: clientId,
    user_message: `[OUTBOUND CALL initiated to ${toNumber}${customerName ? ` (${customerName})` : ''}]${context ? `\nContext: ${context}` : ''}`,
    ai_response: `Outbound call started (ID: ${callId}). Awaiting completion webhook.`,
    channel: 'voice',
    metadata: { type: 'outbound_call_initiated', callId, toNumber, customerName, context },
  });

  return NextResponse.json({ ok: true, callId, provider: voiceConfig.provider });
}
