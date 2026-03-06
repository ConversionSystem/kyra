// POST /api/voice/assistants — Create or sync voice assistant for a client
// GET  /api/voice/assistants?clientId=XXX — Get current assistant config

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getVoiceProvider, buildVoiceConfig } from '@/lib/voice/provider';
import type { VoiceProvider } from '@/lib/voice/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    clientId, provider, apiKey,
    aiName, voiceId, language,
    areaCode,
  } = await req.json();

  // Kyra Native (openclaw) doesn't require an external API key
  if (!clientId || !provider || (!apiKey && provider !== 'openclaw')) {
    return NextResponse.json({ error: 'clientId, provider, and apiKey required' }, { status: 400 });
  }

  const svc = createServiceClientWithoutCookies();

  // Verify ownership
  const { data: client } = await svc
    .from('agency_clients')
    .select('id, name, container_config, agency_id')
    .eq('id', clientId)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const persona = (cfg.persona as string) ?? (cfg.instructions as string) ?? '';
  const industry = (cfg.industry as string) ?? '';

  // Build the voice config from existing client personality
  const voiceAssistantConfig = buildVoiceConfig({
    name: client.name,
    aiName: aiName ?? (cfg.ai_name as string),
    persona,
    industry,
    services: cfg.services as string | undefined,
    hours: cfg.hours as string | undefined,
    bookingUrl: cfg.booking_url as string | undefined,
    phone: cfg.phone as string | undefined,
    address: cfg.address as string | undefined,
  });

  if (voiceId) voiceAssistantConfig.voiceId = voiceId;
  if (language) voiceAssistantConfig.language = language;

  // Create/sync the assistant with the provider
  const providerClient = getVoiceProvider(provider as VoiceProvider, apiKey);
  const { assistantId } = await providerClient.syncAssistant(clientId, voiceAssistantConfig);

  // Provision a phone number (if not already provisioned)
  const existingVoiceConfig = (cfg.voice_config as Record<string, string>) ?? {};
  let phoneNumber = existingVoiceConfig.phoneNumber;
  let phoneNumberId = existingVoiceConfig.phoneNumberId;

  if (!phoneNumber) {
    const provisioned = await providerClient.provisionPhoneNumber(assistantId, areaCode);
    phoneNumber = provisioned.number;
    phoneNumberId = provisioned.id;
  }

  // Store voice config in container_config
  const updatedVoiceConfig = {
    provider,
    apiKey,        // stored in container_config (server-side only)
    assistantId,
    phoneNumber,
    phoneNumberId,
    aiName: aiName ?? voiceAssistantConfig.name,
    voiceId: voiceId ?? null,
    language: language ?? 'en',
    enabled: true,
    syncedAt: new Date().toISOString(),
  };

  // Save voice config: if clientId matches a client, save to agency_clients
  // otherwise (agency-level voice), save to agencies.settings
  const { data: matchedClient } = await svc
    .from('agency_clients').select('id').eq('id', clientId).single();

  if (matchedClient) {
    await svc
      .from('agency_clients')
      .update({ container_config: { ...cfg, voice_config: updatedVoiceConfig } })
      .eq('id', clientId);
  } else {
    // Agency-level voice — clientId is actually agencyId
    const { data: agencyData } = await svc
      .from('agencies').select('settings').eq('id', clientId).single();
    const agencySettings = (agencyData?.settings as Record<string, unknown>) ?? {};
    await svc
      .from('agencies')
      .update({ settings: { ...agencySettings, voice_config: updatedVoiceConfig } })
      .eq('id', clientId);
  }

  return NextResponse.json({
    ok: true,
    assistantId,
    phoneNumber,
    phoneNumberId,
    provider,
  });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();
  const { data: client } = await svc
    .from('agency_clients')
    .select('container_config')
    .eq('id', clientId)
    .single();

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const voiceConfig = (cfg.voice_config as Record<string, unknown>) ?? {};

  // Strip API key before returning to client
  const { apiKey: _, ...safeConfig } = voiceConfig as { apiKey?: string } & Record<string, unknown>;

  return NextResponse.json({ voiceConfig: safeConfig });
}
