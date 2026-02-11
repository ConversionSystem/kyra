import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { chat } from '@/lib/ai/claude';
import { getSystemPrompt, extractCommands, Reminder } from '@/lib/ai/prompts';
const uuid = () => crypto.randomUUID();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * POST /api/channels/telegram/webhook
 * Self-contained webhook handler that doesn't depend on cookies().
 * Uses createServiceClientWithoutCookies for all DB operations.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = request.headers.get('x-telegram-bot-api-secret-token');
  if (process.env.TELEGRAM_WEBHOOK_SECRET && webhookSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const msg = body?.message;

    if (!msg?.text || !msg?.from?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = msg.chat.id;
    const telegramUserId = String(msg.from.id);
    const text = msg.text.trim();

    const supabase = createServiceClientWithoutCookies();

    // Handle /connect <token> command
    if (text.startsWith('/connect ')) {
      const token = text.replace('/connect ', '').trim().toUpperCase();
      return await handleConnect(supabase, chatId, telegramUserId, msg.from, token);
    }

    // Handle /start command
    if (text === '/start') {
      await sendTelegramMessage(chatId,
        "👋 Hi! I'm Kyra, your AI assistant.\n\n" +
        "To connect your account, go to kyra.conversionsystem.com → Settings → Channels, " +
        "get your connection token, then send:\n\n" +
        "/connect YOUR_TOKEN"
      );
      return NextResponse.json({ ok: true });
    }

    // Resolve user from channel link
    console.log('[telegram-webhook] resolving user for telegram id:', telegramUserId);
    const { data: link } = await supabase
      .from('user_channels')
      .select('user_id')
      .eq('channel_type', 'telegram')
      .eq('channel_user_id', telegramUserId)
      .eq('verified', true)
      .single();

    if (!link) {
      console.log('[telegram-webhook] no linked user found');
      await sendTelegramMessage(chatId,
        "Hi! I'm Kyra. I don't recognize your account yet. Please visit kyra.conversionsystem.com to sign up, then link your messaging account in Settings."
      );
      return NextResponse.json({ ok: true });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', link.user_id)
      .single();

    if (!user) {
      console.log('[telegram-webhook] user not found in users table:', link.user_id);
      await sendTelegramMessage(chatId, "Something went wrong finding your account. Please try again.");
      return NextResponse.json({ ok: true });
    }

    console.log('[telegram-webhook] user found:', user.id, user.email);
    
    // DEBUG: Return early to isolate the error
    await sendTelegramMessage(chatId, `Debug: Found user ${user.email}. Conversation lookup next...`);
    return NextResponse.json({ ok: true, debug: 'early-return' });
    
    // Get or create conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('channel', 'telegram')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    let conversationId: string;
    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const newId = uuid();
      await supabase.from('conversations').insert({
        id: newId,
        user_id: user.id,
        title: 'Telegram conversation',
        channel: 'telegram',
      });
      conversationId = newId;
    }

    // Get conversation history
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(15);

    // Build system prompt (no memories/reminders for now to keep it simple and fast)
    const systemPrompt = getSystemPrompt([], []);

    // Call Claude
    const messages = (history || []).map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    messages.push({ role: 'user', content: text });

    console.log('[telegram-webhook] calling Claude with', messages.length, 'messages');
    const result = await chat(messages, systemPrompt);
    console.log('[telegram-webhook] Claude responded, length:', result.content.length);

    const { cleanResponse } = extractCommands(result.content);

    // Save messages
    await supabase.from('messages').insert([
      { id: uuid(), conversation_id: conversationId, role: 'user', content: text, metadata: { channel: 'telegram' } },
      { id: uuid(), conversation_id: conversationId, role: 'assistant', content: cleanResponse, metadata: { model: 'claude-sonnet-4', channel: 'telegram' } },
    ]);

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Send response
    await sendTelegramMessage(chatId, cleanResponse);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram webhook error:', error?.message, error?.stack);
    return NextResponse.json({ error: 'Processing failed', message: error?.message, stack: error?.stack?.split('\n').slice(0, 5) }, { status: 500 });
  }
}

async function handleConnect(supabase: any, chatId: number, telegramUserId: string, fromUser: any, token: string) {
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

  if (channel.token_expires_at && new Date(channel.token_expires_at) < new Date()) {
    await sendTelegramMessage(chatId, "⏰ This token has expired. Please generate a new one in Settings → Channels.");
    return NextResponse.json({ ok: true });
  }

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
