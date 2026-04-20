import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { processChannelMessage } from '@/lib/channels/router';

export const runtime = 'nodejs';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
// Meta WhatsApp Business app secret. Used to verify X-Hub-Signature-256
// (HMAC-SHA256 of the raw request body). See:
// https://developers.facebook.com/docs/graph-api/webhooks/getting-started#event-notifications
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET;

/**
 * Verify a WhatsApp webhook POST via X-Hub-Signature-256. Fail-closed if env unset.
 */
function verifyWhatsAppSignature(rawBody: string, headerValue: string | null): NextResponse | null {
  if (!WHATSAPP_APP_SECRET) {
    console.error('[whatsapp-webhook] WHATSAPP_APP_SECRET not configured — rejecting');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }
  if (!headerValue || !headerValue.startsWith('sha256=')) {
    return NextResponse.json({ error: 'Missing X-Hub-Signature-256 header' }, { status: 401 });
  }
  const expected = crypto
    .createHmac('sha256', WHATSAPP_APP_SECRET)
    .update(rawBody)
    .digest('hex');
  const received = headerValue.slice('sha256='.length);
  if (expected.length !== received.length) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  try {
    const ok = crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(received, 'hex'),
    );
    if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid signature format' }, { status: 401 });
  }
  return null;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * GET /api/channels/whatsapp/webhook
 * WhatsApp Cloud API webhook verification (challenge-response).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('[whatsapp-webhook] Verification successful');
    return new Response(challenge || '', { status: 200 });
  }

  console.warn('[whatsapp-webhook] Verification failed');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST /api/channels/whatsapp/webhook
 * Handles incoming WhatsApp messages.
 */
export async function POST(request: NextRequest) {
  console.log('[whatsapp-webhook] handler called');

  const rawBody = await request.text();
  const sigFailure = verifyWhatsAppSignature(rawBody, request.headers.get('x-hub-signature-256'));
  if (sigFailure) return sigFailure;

  try {
    const body = JSON.parse(rawBody) as any;

    // WhatsApp Cloud API sends messages nested in entry[].changes[].value
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      // Status updates, read receipts, etc. — acknowledge silently
      return NextResponse.json({ ok: true });
    }

    const from = message.from; // phone number (e.g. "1234567890")
    const waMessageId = message.id;

    console.log('[whatsapp-webhook] message from:', from, 'type:', message.type);

    const supabase = getSupabase();

    // Handle non-text messages gracefully
    if (message.type !== 'text') {
      await sendWhatsAppMessage(from, "Thanks for that! I can only handle text messages for now, but I'm working on supporting more types soon. 😊");
      return NextResponse.json({ ok: true });
    }

    const text = message.text?.body?.trim();
    if (!text) {
      return NextResponse.json({ ok: true });
    }

    // Handle connect token
    if (text.toUpperCase().startsWith('CONNECT ')) {
      const token = text.replace(/^connect\s+/i, '').trim().toUpperCase();

      const { data: channel } = await supabase
        .from('user_channels')
        .select('*')
        .eq('channel_type', 'whatsapp')
        .eq('connection_token', token)
        .eq('status', 'pending')
        .single();

      if (!channel) {
        await sendWhatsAppMessage(from, "❌ Invalid or expired token. Please generate a new one from kyra.conversionsystem.com → Settings → Channels.");
        return NextResponse.json({ ok: true });
      }

      if (channel.token_expires_at && new Date(channel.token_expires_at) < new Date()) {
        await sendWhatsAppMessage(from, "⏰ Token expired. Please generate a new one.");
        return NextResponse.json({ ok: true });
      }

      // Get profile name from webhook data
      const profileName = value?.contacts?.[0]?.profile?.name;

      await supabase.from('user_channels').update({
        channel_user_id: from,
        status: 'connected',
        verified: true,
        connected_at: new Date().toISOString(),
        connection_token: null,
        token_expires_at: null,
        metadata: { phoneNumber: from, profileName },
        updated_at: new Date().toISOString(),
      }).eq('id', channel.id);

      await sendWhatsAppMessage(from, "✅ Connected! You can now chat with Kyra here on WhatsApp.");
      return NextResponse.json({ ok: true });
    }

    // Look up user
    const { data: link } = await supabase
      .from('user_channels')
      .select('user_id')
      .eq('channel_type', 'whatsapp')
      .eq('channel_user_id', from)
      .eq('verified', true)
      .single();

    if (!link) {
      await sendWhatsAppMessage(from,
        "I don't recognize your number. Visit kyra.conversionsystem.com to sign up, then link your WhatsApp in Settings → Channels."
      );
      return NextResponse.json({ ok: true });
    }

    // Process through shared router
    const responseText = await processChannelMessage(link.user_id, text, 'whatsapp', waMessageId);
    await sendWhatsAppMessage(from, responseText);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[whatsapp-webhook] ERROR:', error?.message, error?.stack);
    return NextResponse.json({
      error: 'KYRA_WHATSAPP_WEBHOOK_ERROR',
      detail: String(error?.message || error),
    }, { status: 500 });
  }
}

async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('[whatsapp-webhook] WhatsApp credentials not set');
    return;
  }

  const resp = await fetch(
    `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  );

  if (!resp.ok) {
    console.error('[whatsapp-webhook] Send failed:', resp.status, await resp.text());
  }
}
