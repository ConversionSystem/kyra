// POST /api/voice/webhook?provider=vapi|synthflow|retell&clientId=XXX
//
// Receives real-time call events from voice AI providers.
// Stores completed calls as client_conversations with type='call'.
// Triggers GHL follow-up if a hot lead is detected (follow_up_needed=true).

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getVoiceProvider } from '@/lib/voice/provider';
import type { VoiceProvider } from '@/lib/voice/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const provider = url.searchParams.get('provider') as VoiceProvider | null;
  const clientId = url.searchParams.get('clientId');

  if (!provider || !clientId) {
    return NextResponse.json({ error: 'Missing provider or clientId' }, { status: 400 });
  }

  // Get raw body for signature verification
  const rawBody = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Get the API key for this provider from client config
  const svc = createServiceClientWithoutCookies();
  const { data: client } = await svc
    .from('agency_clients')
    .select('id, container_config, agency_id')
    .eq('id', clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const voiceConfig = (cfg.voice_config as Record<string, string>) ?? {};

  // Parse the webhook using provider-specific logic
  // We need the API key to initialize the provider, but parseWebhook doesn't need it
  const providerClient = getVoiceProvider(provider, voiceConfig.apiKey ?? 'placeholder');
  const callRecord = providerClient.parseWebhook(body, Object.fromEntries(req.headers));

  if (!callRecord) {
    // Not a call record event (could be a status check or unsupported event type)
    return NextResponse.json({ received: true, processed: false });
  }

  // Only store completed calls (end-of-call reports)
  if (!['completed', 'failed'].includes(callRecord.status)) {
    return NextResponse.json({ received: true, processed: false, status: callRecord.status });
  }

  // Store as a conversation in client_conversations
  const conversationData = {
    client_id: clientId,
    user_message: callRecord.transcript
      ? `[${callRecord.direction.toUpperCase()} CALL from ${callRecord.callerNumber ?? 'unknown'}]\n\n${callRecord.transcript}`
      : `[${callRecord.direction.toUpperCase()} CALL from ${callRecord.callerNumber ?? 'unknown'}] — Duration: ${callRecord.durationSeconds ?? 0}s`,
    ai_response: callRecord.summary ?? `Call ${callRecord.status}. Duration: ${callRecord.durationSeconds ?? 0} seconds.`,
    channel: 'voice',
    metadata: {
      type: 'call',
      callId: callRecord.callId,
      provider: callRecord.provider,
      phoneNumber: callRecord.phoneNumber,
      callerNumber: callRecord.callerNumber,
      direction: callRecord.direction,
      status: callRecord.status,
      durationSeconds: callRecord.durationSeconds,
      recordingUrl: callRecord.recordingUrl,
      endedReason: callRecord.endedReason,
    },
    created_at: callRecord.endedAt ?? new Date().toISOString(),
  };

  await svc.from('client_conversations').insert(conversationData);

  // Update usage counter (best-effort)
  try { await svc.rpc('increment_client_usage', { p_client_id: clientId }); } catch { /* ignore */ }

  // Deduct credit for the call (1 credit = 1 conversation, including calls)
  // (non-fatal — don't block if credits table doesn't exist)
  try {
    const { deductCredit } = await import('@/lib/billing/credit-engine');
    await deductCredit(client.agency_id, clientId, `Voice call (${callRecord.direction}, ${callRecord.durationSeconds ?? 0}s)`);
  } catch { /* non-fatal */ }

  // Trigger GHL follow-up if call indicates a hot lead
  if (callRecord.summary?.toLowerCase().includes('follow_up_needed') ||
      callRecord.endedReason === 'customer_requested_callback') {
    const ghlToken = (cfg.ghl_private_token as string) ?? (cfg.ghl_access_token as string);
    const contactPhone = callRecord.callerNumber;

    if (ghlToken && contactPhone) {
      // Fire-and-forget: post to GHL follow-up webhook
      const ghlWebhook = process.env.ESCALATION_WEBHOOK_URL;
      if (ghlWebhook) {
        fetch(ghlWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'voice_call_followup',
            clientId,
            callerPhone: contactPhone,
            callSummary: callRecord.summary,
            recordingUrl: callRecord.recordingUrl,
            duration: callRecord.durationSeconds,
          }),
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ received: true, processed: true, callId: callRecord.callId });
}

// GET handler for webhook verification (some providers ping with GET)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const challenge = url.searchParams.get('hub.challenge') ?? url.searchParams.get('challenge');
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ status: 'ok', service: 'kyra-voice-webhook' });
}
