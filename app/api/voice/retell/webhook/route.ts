/**
 * POST /api/voice/retell/webhook
 *
 * Receives events from Retell AI when calls happen:
 * - call_started: log call start
 * - call_ended: save transcript, duration, recording to conversations
 * - call_analyzed: save sentiment + summary to CRM
 *
 * Retell sends: { event, call }
 *
 * Signature: HMAC-SHA256 of raw body using RETELL_API_KEY as the secret.
 * Sent in header `x-retell-signature` (hex-encoded).
 * Docs: https://docs.retellai.com/features/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Retell-Signature',
};

function verifyRetellSignature(rawBody: string, signatureHeader: string | null, apiKey: string): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac('sha256', apiKey).update(rawBody).digest('hex');
  // Strip optional 'v=' prefix some Retell envs emit.
  const received = signatureHeader.replace(/^v=/, '').trim();
  if (expected.length !== received.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(received, 'hex'),
    );
  } catch {
    return false;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  // Fail-closed: webhook requires API key to verify signatures.
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    console.error('[retell-webhook] RETELL_API_KEY not configured — rejecting');
    return NextResponse.json(
      { error: 'Webhook verification key not configured' },
      { status: 500, headers: CORS },
    );
  }

  // Raw body for HMAC, then parse.
  const rawBody = await request.text();
  const sigHeader = request.headers.get('x-retell-signature');

  if (!verifyRetellSignature(rawBody, sigHeader, apiKey)) {
    console.warn('[retell-webhook] Invalid or missing signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401, headers: CORS });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = JSON.parse(rawBody);
    const event = body.event as string;
    const call = body.call as Record<string, unknown> | undefined;

    if (!event || !call) {
      return NextResponse.json({ error: 'Missing event or call data' }, { status: 400, headers: CORS });
    }

    const callId = call.call_id as string;
    const agentId = call.agent_id as string;
    const supabase = createServiceClientWithoutCookies();

    // Find which client this agent belongs to
    const { data: clients } = await supabase
      .from('agency_clients')
      .select('id, agency_id, name, container_config')
      .filter('container_config->>voice_config', 'cs', `"retell_agent_id":"${agentId}"`);

    const client = clients?.[0];
    const clientId = client?.id;
    const agencyId = client?.agency_id;

    switch (event) {
      case 'call_started': {
        console.log(`[retell-webhook] Call started: ${callId} → agent ${agentId}`);

        if (clientId && agencyId) {
          await supabase.from('client_conversations').insert({
            client_id: clientId,
            agency_id: agencyId,
            channel: 'voice',
            direction: (call.direction as string) || 'inbound',
            contact_phone: (call.from_number as string) || (call.to_number as string) || null,
            user_message: '[Call started]',
            ai_response: null,
            metadata: { retell_call_id: callId, provider: 'retell' },
          });
        }
        break;
      }

      case 'call_ended': {
        const duration = call.end_timestamp && call.start_timestamp
          ? Math.round(((call.end_timestamp as number) - (call.start_timestamp as number)) / 1000)
          : 0;
        const transcript = (call.transcript as string) || '';
        const recordingUrl = (call.recording_url as string) || null;
        const disconnectReason = (call.disconnect_reason as string) || '';

        console.log(`[retell-webhook] Call ended: ${callId} | ${duration}s | reason: ${disconnectReason}`);

        if (clientId && agencyId) {
          // Save transcript as conversation
          await supabase.from('client_conversations').insert({
            client_id: clientId,
            agency_id: agencyId,
            channel: 'voice',
            direction: (call.direction as string) || 'inbound',
            contact_phone: (call.from_number as string) || (call.to_number as string) || null,
            user_message: transcript || '[Call transcript]',
            ai_response: `[Voice call - ${duration}s]`,
            metadata: {
              retell_call_id: callId,
              provider: 'retell',
              duration_seconds: duration,
              recording_url: recordingUrl,
              disconnect_reason: disconnectReason,
            },
          });

          // Update voice usage
          const currentMonth = new Date().toISOString().slice(0, 7);
          const minutesUsed = Math.ceil(duration / 60);
          try {
            await supabase.from('voice_usage').upsert({
              agency_id: agencyId,
              year_month: currentMonth,
              minutes_used: minutesUsed,
            }, { onConflict: 'agency_id,year_month' });
          } catch { /* voice_usage table may not exist yet */ }
        }
        break;
      }

      case 'call_analyzed': {
        const analysis = call.call_analysis as Record<string, unknown> | undefined;
        if (!analysis) break;

        const summary = analysis.call_summary as string | undefined;
        const sentiment = analysis.user_sentiment as string | undefined;
        const successful = analysis.call_successful as boolean | undefined;

        console.log(`[retell-webhook] Call analyzed: ${callId} | sentiment: ${sentiment} | success: ${successful}`);

        // Update CRM contact if we can match by phone
        if (clientId && agencyId) {
          const phone = (call.from_number as string) || (call.to_number as string);
          if (phone && summary) {
            const { data: contact } = await supabase
              .from('crm_contacts')
              .select('id')
              .eq('agency_id', agencyId)
              .eq('phone', phone)
              .maybeSingle();

            if (contact) {
              await supabase.from('crm_activities').insert({
                agency_id: agencyId,
                contact_id: contact.id,
                type: 'call',
                subject: `AI Voice Call (${sentiment || 'neutral'})`,
                description: summary,
                actor: 'ai',
                metadata: {
                  retell_call_id: callId,
                  sentiment,
                  successful,
                  provider: 'retell',
                },
              });
            }
          }
        }
        break;
      }

      default:
        console.log(`[retell-webhook] Unknown event: ${event}`);
    }

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (err) {
    console.error('[retell-webhook] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: CORS });
  }
}
