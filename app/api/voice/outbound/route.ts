// POST /api/voice/outbound — Trigger an AI outbound call
// Used for: missed call follow-up, lead re-engagement, appointment reminders

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getVoiceProvider, buildVoiceConfig } from '@/lib/voice/provider';
import type { VoiceProvider } from '@/lib/voice/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId, toNumber, customerName, context } = await req.json();
  if (!clientId || !toNumber) {
    return NextResponse.json({ error: 'clientId and toNumber required' }, { status: 400 });
  }

  const svc = createServiceClientWithoutCookies();
  let client: { id: string; name: string; container_config: unknown; agency_id: string } | null = null;
  let cfg: Record<string, unknown> = {};

  const { data: clientRow } = await svc
    .from('agency_clients')
    .select('id, name, container_config, agency_id')
    .eq('id', clientId)
    .single();

  if (clientRow) {
    client = clientRow;
    cfg = (client.container_config as Record<string, unknown>) ?? {};
  } else {
    // Fallback: agency-level voice
    const { data: agencyRow } = await svc
      .from('agencies')
      .select('id, name, settings')
      .eq('id', clientId)
      .single();
    if (agencyRow) {
      client = { id: agencyRow.id, name: agencyRow.name, container_config: agencyRow.settings, agency_id: agencyRow.id };
      cfg = (agencyRow.settings as Record<string, unknown>) ?? {};
    }
  }

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

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
