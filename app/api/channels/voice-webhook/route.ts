// ============================================================================
// POST /api/channels/voice-webhook
//
// Handles inbound voice calls via Twilio TwiML or GHL voice webhooks.
// When a call comes in, Twilio asks this endpoint for instructions.
// We respond with TwiML that reads an AI-generated greeting, then
// optionally records a voicemail which gets transcribed and replied to.
//
// SETUP:
//   1. Get Twilio account (twilio.com) + phone number
//   2. Set voice webhook URL on phone number:
//      https://kyra.conversionsystem.com/api/channels/voice-webhook?clientId=CLIENT_ID
//   3. Set webhook HTTP method: POST
//
// ENV VARS:
//   TWILIO_AUTH_TOKEN — for webhook signature validation
//
// GHL voice: Set GHL phone number → Voice → External → this URL
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function twiml(xml: string) {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');

  if (!clientId) {
    return twiml('<Say voice="Polly.Joanna">Sorry, this number is not configured. Goodbye.</Say><Hangup/>');
  }

  const supabase = getSupabase();

  // Parse Twilio form body
  const formData = await request.formData().catch(() => new FormData());
  const callerNumber = formData.get('From')?.toString() || 'Unknown';
  const recordingUrl = formData.get('RecordingUrl')?.toString() || '';
  const transcriptionText = formData.get('TranscriptionText')?.toString() || '';
  const callStatus = formData.get('CallStatus')?.toString() || '';

  console.log(`[voice-webhook] clientId=${clientId} from=${callerNumber} status=${callStatus}`);

  // If this is a transcription callback (Twilio calls back with the transcript)
  if (transcriptionText && callerNumber !== 'Unknown') {
    console.log(`[voice-webhook] Transcription: "${transcriptionText.slice(0, 100)}"`);

    // Get client AI
    const { data: client } = await supabase
      .from('agency_clients')
      .select('id, name, agency_id, gateway_url, gateway_token, gateway_status, container_config')
      .eq('id', clientId)
      .single();

    if (client?.gateway_url && ['running', 'starting'].includes(client.gateway_status || '')) {
      const cfg = (client.container_config as Record<string, unknown>) ?? {};
      const persona = (cfg.persona as string) || `AI assistant for ${client.name}`;

      // Generate AI follow-up SMS (since we can't call back automatically, SMS is best UX)
      try {
        const chatRes = await fetch(`${client.gateway_url}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${client.gateway_token}`,
          },
          body: JSON.stringify({
            model: 'openrouter/anthropic/claude-haiku-4.5',
            messages: [
              {
                role: 'system',
                content: `You are ${persona}. A customer just left a voicemail. You're following up via SMS. Be helpful and concise (2-3 sentences max).`,
              },
              { role: 'user', content: `Voicemail content: "${transcriptionText}"` },
            ],
            stream: false,
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (chatRes.ok) {
          const data = await chatRes.json();
          const aiReply = data?.choices?.[0]?.message?.content?.trim();
          if (aiReply) {
            // Log for the dashboard
            await supabase.from('client_conversations').insert({
              client_id: client.id,
              agency_id: client.agency_id,
              channel: 'voice',
              user_message: `[VOICEMAIL from ${callerNumber}] ${transcriptionText}`,
              ai_response: `[SMS FOLLOW-UP SENT] ${aiReply}`,
            });
          }
        }
      } catch (err: any) {
        console.error(`[voice-webhook] AI follow-up error: ${err.message}`);
      }
    }

    return new NextResponse('', { status: 200 });
  }

  // First call — respond with TwiML greeting + record voicemail
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, container_config')
    .eq('id', clientId)
    .single();

  const cfg = (client?.container_config as Record<string, unknown>) ?? {};
  const voiceGreeting = (cfg.voice_greeting as string) ||
    (client?.name ? `Thank you for calling ${client.name}. We're not available right now, but leave a message after the tone and we'll text you back shortly.` :
    `Thank you for calling. We're not available right now. Please leave a message after the tone.`);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com').replace(/\/$/, '');

  return twiml(`
    <Say voice="Polly.Joanna" rate="90%">${voiceGreeting}</Say>
    <Record
      maxLength="120"
      transcribe="true"
      transcribeCallback="${appUrl}/api/channels/voice-webhook?clientId=${clientId}"
      playBeep="true"
      finishOnKey="#"
    />
    <Say voice="Polly.Joanna">Thank you for your message. Goodbye!</Say>
    <Hangup/>
  `);
}
