import { NextRequest, NextResponse } from 'next/server';
import { processChannelMessage } from '@/lib/channels/router';
import { ChannelMessage, ChannelType } from '@/types/channels';

/**
 * POST /api/channels/webhook
 * 
 * Universal webhook endpoint for all messaging channels.
 * Each channel adapter normalizes the payload before processing.
 * 
 * Headers:
 *   x-channel-type: whatsapp | telegram | slack
 *   x-webhook-secret: channel-specific verification
 */
export async function POST(request: NextRequest) {
  const channelType = request.headers.get('x-channel-type') as ChannelType;
  const webhookSecret = request.headers.get('x-webhook-secret');
  
  if (!channelType) {
    return NextResponse.json({ error: 'Missing x-channel-type header' }, { status: 400 });
  }
  
  // Verify webhook secret
  const expectedSecret = process.env[`${channelType.toUpperCase()}_WEBHOOK_SECRET`];
  if (expectedSecret && webhookSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    
    // Normalize payload based on channel type
    let inbound: ChannelMessage | null = null;
    
    switch (channelType) {
      case 'whatsapp':
        inbound = normalizeWhatsApp(body);
        break;
      case 'telegram':
        inbound = normalizeTelegram(body);
        break;
      case 'slack':
        inbound = normalizeSlack(body);
        break;
      default:
        return NextResponse.json({ error: `Unsupported channel: ${channelType}` }, { status: 400 });
    }
    
    if (!inbound) {
      return NextResponse.json({ ok: true }); // Non-message event, acknowledge
    }
    
    const response = await processChannelMessage(inbound);
    
    // Return response for the channel to deliver
    return NextResponse.json({
      channel: channelType,
      response: response,
    });
  } catch (error) {
    console.error(`Channel webhook error (${channelType}):`, error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

/**
 * GET — Telegram/WhatsApp webhook verification
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  
  // WhatsApp verification challenge
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  
  return NextResponse.json({ status: 'ok' });
}

// --- Channel Normalizers ---

function normalizeWhatsApp(body: any): ChannelMessage | null {
  // WhatsApp Cloud API format
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const msg = change?.value?.messages?.[0];
  
  if (!msg || msg.type !== 'text') return null;
  
  return {
    channelType: 'whatsapp',
    channelUserId: msg.from,
    channelMessageId: msg.id,
    text: msg.text?.body || '',
    timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
  };
}

function normalizeTelegram(body: any): ChannelMessage | null {
  const msg = body?.message;
  if (!msg?.text) return null;
  
  return {
    channelType: 'telegram',
    channelUserId: String(msg.from?.id),
    channelMessageId: String(msg.message_id),
    text: msg.text,
    metadata: {
      chatId: msg.chat?.id,
      username: msg.from?.username,
      firstName: msg.from?.first_name,
    },
    timestamp: new Date(msg.date * 1000).toISOString(),
  };
}

function normalizeSlack(body: any): ChannelMessage | null {
  // Slack Events API
  if (body.type === 'url_verification') return null; // Handled separately
  
  const event = body?.event;
  if (!event || event.type !== 'message' || event.bot_id) return null;
  
  return {
    channelType: 'slack',
    channelUserId: event.user,
    channelMessageId: event.ts,
    text: event.text || '',
    metadata: { channel: event.channel },
    timestamp: new Date(parseFloat(event.ts) * 1000).toISOString(),
  };
}
