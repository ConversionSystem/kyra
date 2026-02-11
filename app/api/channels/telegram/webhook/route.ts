import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(request: NextRequest) {
  console.log('[telegram-webhook] handler called');
  
  try {
    const body = await request.json();
    const msg = body?.message;

    if (!msg?.text || !msg?.from?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = msg.chat.id;
    const telegramUserId = String(msg.from.id);
    const text = msg.text.trim();

    console.log('[telegram-webhook] message from:', telegramUserId, 'text:', text);

    const supabase = getSupabase();

    // Handle /connect <token> command
    if (text.startsWith('/connect ')) {
      const token = text.replace('/connect ', '').trim().toUpperCase();
      
      const { data: channel } = await supabase
        .from('user_channels')
        .select('*')
        .eq('channel_type', 'telegram')
        .eq('connection_token', token)
        .eq('status', 'pending')
        .single();

      if (!channel) {
        await sendTelegramMessage(chatId, "❌ Invalid or expired token.");
        return NextResponse.json({ ok: true });
      }

      if (channel.token_expires_at && new Date(channel.token_expires_at) < new Date()) {
        await sendTelegramMessage(chatId, "⏰ Token expired. Generate a new one.");
        return NextResponse.json({ ok: true });
      }

      await supabase.from('user_channels').update({
        channel_user_id: telegramUserId,
        status: 'connected',
        verified: true,
        connected_at: new Date().toISOString(),
        connection_token: null,
        token_expires_at: null,
        metadata: { username: msg.from.username, firstName: msg.from.first_name, chatId },
        updated_at: new Date().toISOString(),
      }).eq('id', channel.id);

      await sendTelegramMessage(chatId, "✅ Connected! You can now chat with Kyra here.");
      return NextResponse.json({ ok: true });
    }

    // Handle /start
    if (text === '/start') {
      await sendTelegramMessage(chatId,
        "👋 Hi! I'm Kyra.\n\nTo connect: go to kyra.conversionsystem.com → Settings → Channels, get your token, then send:\n\n/connect YOUR_TOKEN"
      );
      return NextResponse.json({ ok: true });
    }

    // Resolve user
    console.log('[telegram-webhook] looking up user channel');
    const { data: link } = await supabase
      .from('user_channels')
      .select('user_id')
      .eq('channel_type', 'telegram')
      .eq('channel_user_id', telegramUserId)
      .eq('verified', true)
      .single();

    if (!link) {
      await sendTelegramMessage(chatId,
        "I don't recognize your account. Visit kyra.conversionsystem.com to sign up, then link your Telegram in Settings → Channels."
      );
      return NextResponse.json({ ok: true });
    }

    console.log('[telegram-webhook] found link, user_id:', link.user_id);

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, plan, usage_this_month')
      .eq('id', link.user_id)
      .single();

    if (!user) {
      await sendTelegramMessage(chatId, "Account error. Please try again.");
      return NextResponse.json({ ok: true });
    }

    console.log('[telegram-webhook] user:', user.id, user.email);

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
      conversationId = crypto.randomUUID();
      await supabase.from('conversations').insert({
        id: conversationId,
        user_id: user.id,
        title: 'Telegram conversation',
        channel: 'telegram',
      });
    }

    console.log('[telegram-webhook] conversation:', conversationId);

    // Get history
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(15);

    // Call Claude directly via API (no SDK to avoid Node.js module issues)
    const messages = (history || []).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));
    messages.push({ role: 'user', content: text });

    console.log('[telegram-webhook] calling Claude API with', messages.length, 'messages');

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `You are Kyra, a helpful personal AI assistant. You remember past conversations and help with anything the user needs. Be friendly, concise, and helpful. The user's name is ${user.name || 'there'}.`,
        messages,
      }),
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error('[telegram-webhook] Claude API error:', claudeResponse.status, err);
      await sendTelegramMessage(chatId, "Sorry, I'm having trouble thinking right now. Please try again.");
      return NextResponse.json({ ok: true });
    }

    const claudeData = await claudeResponse.json() as any;
    const responseText = claudeData.content?.[0]?.text || "I couldn't generate a response.";

    console.log('[telegram-webhook] Claude responded, length:', responseText.length);

    // Save messages
    await supabase.from('messages').insert([
      { id: crypto.randomUUID(), conversation_id: conversationId, role: 'user', content: text, metadata: { channel: 'telegram' } },
      { id: crypto.randomUUID(), conversation_id: conversationId, role: 'assistant', content: responseText, metadata: { model: 'claude-sonnet-4', channel: 'telegram' } },
    ]);

    await supabase.from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Send response
    await sendTelegramMessage(chatId, responseText);
    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('[telegram-webhook] CAUGHT ERROR:', error?.message, error?.stack);
    return NextResponse.json({ 
      error: 'KYRA_WEBHOOK_CAUGHT_ERROR', 
      detail: String(error?.message || error),
      stack: String(error?.stack || '').split('\n').slice(0, 5),
    }, { status: 500 });
  }
}

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[telegram-webhook] TELEGRAM_BOT_TOKEN not set');
    return;
  }

  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!resp.ok) {
    console.error('[telegram-webhook] Telegram send failed:', resp.status, await resp.text());
  }
}
