import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { processChannelMessage } from '@/lib/channels/router';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * POST /api/channels/telegram/webhook
 * Receives Telegram Bot API webhook updates directly.
 * Handles /connect <token> for account linking + regular messages.
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret via URL path token (Telegram style)
  const webhookSecret = request.headers.get('x-telegram-bot-api-secret-token');
  if (process.env.TELEGRAM_WEBHOOK_SECRET && webhookSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const msg = body?.message;

    if (!msg?.text || !msg?.from?.id) {
      return NextResponse.json({ ok: true }); // Non-message update, acknowledge
    }

    const chatId = msg.chat.id;
    const telegramUserId = String(msg.from.id);
    const text = msg.text.trim();

    // Handle /connect <token> command
    if (text.startsWith('/connect ')) {
      const token = text.replace('/connect ', '').trim().toUpperCase();
      return await handleConnect(chatId, telegramUserId, msg.from, token);
    }

    // Handle /start command
    if (text === '/start') {
      await sendTelegramMessage(chatId, 
        "👋 Hi! I'm Kyra, your AI assistant.\n\n" +
        "To connect your account, go to kyra.conversationsystem.com → Settings → Channels, " +
        "get your connection token, then send:\n\n" +
        "/connect YOUR_TOKEN"
      );
      return NextResponse.json({ ok: true });
    }

    // Regular message — route through Kyra's brain
    const response = await processChannelMessage({
      channelType: 'telegram',
      channelUserId: telegramUserId,
      channelMessageId: String(msg.message_id),
      text,
      metadata: { chatId, username: msg.from.username, firstName: msg.from.first_name },
      timestamp: new Date(msg.date * 1000).toISOString(),
    });

    await sendTelegramMessage(chatId, response.text);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handleConnect(chatId: number, telegramUserId: string, fromUser: any, token: string) {
  const supabase = await createServiceClient();

  // Find pending channel with this token
  const { data: channel } = await supabase
    .from('user_channels')
    .select('*')
    .eq('channel_type', 'telegram')
    .eq('connection_token', token)
    .eq('status', 'pending')
    .single();

  if (!channel) {
    await sendTelegramMessage(chatId, "❌ Invalid or expired token. Please generate a new one in Settings → Channels.");
    return NextResponse.json({ ok: true });
  }

  // Check expiry
  if (channel.token_expires_at && new Date(channel.token_expires_at) < new Date()) {
    await sendTelegramMessage(chatId, "⏰ This token has expired. Please generate a new one in Settings → Channels.");
    return NextResponse.json({ ok: true });
  }

  // Link the account
  const { error } = await supabase
    .from('user_channels')
    .update({
      channel_user_id: telegramUserId,
      status: 'connected',
      verified: true,
      connected_at: new Date().toISOString(),
      connection_token: null,
      token_expires_at: null,
      metadata: {
        username: fromUser.username,
        firstName: fromUser.first_name,
        lastName: fromUser.last_name,
        chatId,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', channel.id);

  if (error) {
    console.error('Failed to link Telegram account:', error);
    await sendTelegramMessage(chatId, "❌ Something went wrong. Please try again.");
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(chatId, "✅ Connected! You can now chat with Kyra right here on Telegram. Try saying hello!");
  return NextResponse.json({ ok: true });
}

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not set, skipping message send');
    return;
  }

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });
}
