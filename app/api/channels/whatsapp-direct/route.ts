// ============================================================================
// WhatsApp Business API (Meta Cloud API) — Direct Integration
//
// No GHL dependency. Uses Meta's official WhatsApp Business Cloud API.
//
// SETUP REQUIRED (see /docs/whatsapp-setup.md):
//   1. Create Meta Business account → developers.facebook.com
//   2. Add WhatsApp product → get phone_number_id + access_token
//   3. Set webhook URL: https://kyra.conversionsystem.com/api/channels/whatsapp-direct
//   4. Set verify_token = process.env.WHATSAPP_VERIFY_TOKEN
//   5. Subscribe to: messages
//
// ENV VARS:
//   WHATSAPP_VERIFY_TOKEN — any string you choose (set in Meta webhook config)
//   WHATSAPP_ACCESS_TOKEN — Meta system user access token (permanent)
//   WHATSAPP_PHONE_NUMBER_ID — from Meta Business dashboard
//
// Each message is matched to a Kyra client by: phone number suffix match on
// ghl_location_id, or by a future whatsapp_phone_id column on agency_clients.
// For now: uses WHATSAPP_DEFAULT_CLIENT_ID env var for single-client deployments.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const META_API_BASE = 'https://graph.facebook.com/v19.0';

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// ── GET: Webhook verification (Meta handshake) ───────────────────────────────
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[whatsapp-direct] Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// ── POST: Incoming message handler ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Meta sends: { object: "whatsapp_business_account", entry: [...] }
  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error('[whatsapp-direct] Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
    return NextResponse.json({ ok: true }); // always 200 to Meta
  }

  const supabase = getSupabase();

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages?.length) continue;

      for (const message of value.messages) {
        if (message.type !== 'text') continue; // skip media, reactions, etc.

        const from = message.from; // e.g. "14155238886"
        const msgText = message.text?.body?.trim();
        if (!msgText) continue;

        console.log(`[whatsapp-direct] Inbound from ${from}: "${msgText.slice(0, 60)}"`);

        // Find the matching Kyra client (by whatsapp_phone_id or default)
        const defaultClientId = process.env.WHATSAPP_DEFAULT_CLIENT_ID;
        if (!defaultClientId) {
          console.error('[whatsapp-direct] WHATSAPP_DEFAULT_CLIENT_ID not set — cannot route message');
          continue;
        }

        const { data: client } = await supabase
          .from('agency_clients')
          .select('id, name, agency_id, gateway_url, gateway_token, gateway_status, container_config')
          .eq('id', defaultClientId)
          .single();

        if (!client?.gateway_url || !['running', 'starting'].includes(client.gateway_status || '')) {
          console.error(`[whatsapp-direct] Client AI unavailable for ${defaultClientId}`);
          continue;
        }

        // Mark message as read
        void fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: message.id }),
        }).catch(() => {});

        // Show typing indicator
        void fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: from, type: 'reaction', reaction: { message_id: message.id, emoji: '⏳' } }),
        }).catch(() => {});

        const cfg = (client.container_config as Record<string, unknown>) ?? {};
        const persona = (cfg.persona as string) || `AI assistant for ${client.name}`;
        const contactName = value.contacts?.[0]?.profile?.name || from;

        const sessionKey = `wa:${client.id.slice(0, 8)}:${from}:${new Date().toISOString().slice(0, 10)}`;

        // Call AI gateway
        let aiResponse = '';
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
                  content: [
                    `You are ${persona}. You are responding via WhatsApp — keep replies conversational and concise (1-3 sentences max).`,
                    `The customer's name is: ${contactName}.`,
                    `Do not mention you are an AI unless directly asked.`,
                    cfg.calendar_url ? `Booking link: ${cfg.calendar_url}` : '',
                    `If you cannot resolve the issue, say: "I'll flag this for our team — they'll follow up with you shortly."`,
                  ].filter(Boolean).join('\n'),
                },
                { role: 'user', content: msgText },
              ],
              stream: false,
              session_key: sessionKey,
            }),
            signal: AbortSignal.timeout(25_000),
          });

          if (chatRes.ok) {
            const data = await chatRes.json();
            aiResponse = data?.choices?.[0]?.message?.content?.trim() || '';
          }
        } catch (err: any) {
          console.error(`[whatsapp-direct] Gateway error: ${err.message}`);
        }

        if (!aiResponse) continue;

        // Send WhatsApp reply
        const sendRes = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: from,
            type: 'text',
            text: { body: aiResponse },
          }),
          signal: AbortSignal.timeout(10_000),
        });

        if (sendRes.ok) {
          console.log(`[whatsapp-direct] ✅ Replied to ${from}`);
          await supabase.from('client_conversations').insert({
            client_id: client.id,
            agency_id: client.agency_id,
            channel: 'whatsapp_direct',
            user_message: `[${contactName}] ${msgText}`,
            ai_response: aiResponse,
          });
        } else {
          const err = await sendRes.text().catch(() => '');
          console.error(`[whatsapp-direct] Send failed: ${sendRes.status} ${err.slice(0, 100)}`);
        }
      }
    }
  }

  return NextResponse.json({ ok: true }); // Meta requires 200
}
