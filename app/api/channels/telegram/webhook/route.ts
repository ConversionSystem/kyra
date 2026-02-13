import { NextRequest, NextResponse } from 'next/server';
import { processChannelMessage } from '@/lib/channels/router';
import { transcribeAudio } from '@/lib/channels/whisper';
import { textToSpeech } from '@/lib/channels/voice';
import { analyzeImage } from '@/lib/tools/image-analysis';
import { getCreditCost } from '@/lib/billing/plans';

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
    const body = (await request.json()) as any;
    const msg = body?.message;

    if (!msg?.from?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = msg.chat.id;
    const telegramUserId = String(msg.from.id);

    // Voice message handling
    if (msg.voice) {
      return handleVoiceMessage(msg, chatId, telegramUserId);
    }

    // Photo message handling
    if (msg.photo && msg.photo.length > 0) {
      return handlePhotoMessage(msg, chatId, telegramUserId);
    }

    // Text message handling — require text from here on
    if (!msg.text) {
      return NextResponse.json({ ok: true });
    }

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

    // Process through shared channel router
    try {
      const responseText = await processChannelMessage(link.user_id, text, 'telegram', String(msg.message_id));
      await sendTelegramMessage(chatId, responseText);
    } catch (err: any) {
      console.error('[telegram-webhook] processChannelMessage error:', err?.message);
      await sendTelegramMessage(chatId, "Sorry, I'm having trouble thinking right now. Please try again.");
    }
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

/**
 * Handle incoming Telegram photo messages:
 * 1. Download highest-resolution photo from Telegram
 * 2. Build a temporary public URL for the file
 * 3. Analyze with Claude Vision
 * 4. Send description back to user
 */
async function handlePhotoMessage(msg: any, chatId: number, telegramUserId: string) {
  const supabase = getSupabase();

  // Resolve user
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

  const userId = link.user_id;
  console.log('[telegram-webhook] photo message from user:', userId);

  // Deduct image analysis credits
  const { data: user } = await supabase
    .from('users')
    .select('usage_this_month')
    .eq('id', userId)
    .single();

  const currentUsage = user?.usage_this_month || 0;
  const imageCost = getCreditCost('image_analysis');
  await supabase
    .from('users')
    .update({ usage_this_month: currentUsage + imageCost })
    .eq('id', userId);

  // Get highest resolution photo (last in array)
  const photo = msg.photo[msg.photo.length - 1];

  // Build direct Telegram file URL for Claude to fetch
  let fileUrl: string;
  try {
    if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set');
    const fileInfoResp = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`
    );
    if (!fileInfoResp.ok) throw new Error(`getFile failed: ${fileInfoResp.status}`);
    const fileInfo = (await fileInfoResp.json()) as any;
    const filePath = fileInfo.result?.file_path;
    if (!filePath) throw new Error('No file_path in getFile response');
    fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  } catch (err: any) {
    console.error('[telegram-webhook] photo download failed:', err?.message);
    await sendTelegramMessage(chatId, "Sorry, I couldn't download your photo. Please try again.");
    return NextResponse.json({ ok: true });
  }

  // Analyze with Claude Vision
  const caption = msg.caption?.trim() || undefined;
  try {
    const description = await analyzeImage(fileUrl, caption);
    await sendTelegramMessage(chatId, description);
  } catch (err: any) {
    console.error('[telegram-webhook] image analysis failed:', err?.message);
    await sendTelegramMessage(chatId, "Sorry, I couldn't analyze that image. Please try again.");
  }

  return NextResponse.json({ ok: true });
}

/**
 * Handle incoming Telegram voice messages:
 * 1. Download voice file from Telegram
 * 2. Transcribe with Whisper
 * 3. Process as text through channel router
 * 4. If user has TTS skill enabled, send voice response back
 */
async function handleVoiceMessage(msg: any, chatId: number, telegramUserId: string) {
  const supabase = getSupabase();

  // Resolve user
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

  const userId = link.user_id;
  console.log('[telegram-webhook] voice message from user:', userId);

  // Deduct transcription credits
  const { data: user } = await supabase
    .from('users')
    .select('usage_this_month')
    .eq('id', userId)
    .single();

  const currentUsage = user?.usage_this_month || 0;
  const transcribeCost = getCreditCost('voice_transcribe');

  await supabase
    .from('users')
    .update({ usage_this_month: currentUsage + transcribeCost })
    .eq('id', userId);

  // Download voice file from Telegram
  let audioBuffer: Buffer;
  try {
    audioBuffer = await downloadTelegramFile(msg.voice.file_id);
  } catch (err: any) {
    console.error('[telegram-webhook] voice download failed:', err?.message);
    await sendTelegramMessage(chatId, "Sorry, I couldn't download your voice message. Please try again.");
    return NextResponse.json({ ok: true });
  }

  // Transcribe with Whisper
  let transcription: string;
  try {
    transcription = await transcribeAudio(audioBuffer, { filename: 'voice.ogg' });
  } catch (err: any) {
    console.error('[telegram-webhook] transcription failed:', err?.message);
    await sendTelegramMessage(chatId, "Sorry, I couldn't understand your voice message. Could you try again or type your message?");
    return NextResponse.json({ ok: true });
  }

  if (!transcription.trim()) {
    await sendTelegramMessage(chatId, "I couldn't make out any words in that voice message. Could you try again?");
    return NextResponse.json({ ok: true });
  }

  console.log('[telegram-webhook] transcribed:', transcription.substring(0, 100));

  // Process transcription as text through channel router
  let responseText: string;
  try {
    responseText = await processChannelMessage(userId, transcription, 'telegram', String(msg.message_id));
  } catch (err: any) {
    console.error('[telegram-webhook] processChannelMessage error:', err?.message);
    await sendTelegramMessage(chatId, "Sorry, I'm having trouble thinking right now. Please try again.");
    return NextResponse.json({ ok: true });
  }

  // Always send text response
  await sendTelegramMessage(chatId, responseText);

  // Check if user has TTS skill enabled — send voice reply too
  try {
    const { data: ttsSkill } = await supabase
      .from('user_skills')
      .select('id')
      .eq('user_id', userId)
      .eq('skill_id', 'tts')
      .eq('enabled', true)
      .single();

    if (ttsSkill) {
      // Deduct TTS credits
      const { data: updatedUser } = await supabase
        .from('users')
        .select('usage_this_month')
        .eq('id', userId)
        .single();

      const ttsCost = getCreditCost('voice_tts');
      await supabase
        .from('users')
        .update({ usage_this_month: (updatedUser?.usage_this_month || 0) + ttsCost })
        .eq('id', userId);

      const audioBuffer = await textToSpeech(responseText);
      await sendTelegramVoice(chatId, audioBuffer);
    }
  } catch (err: any) {
    // TTS is best-effort — text was already sent
    console.error('[telegram-webhook] TTS response failed:', err?.message);
  }

  return NextResponse.json({ ok: true });
}

/**
 * Download a file from Telegram using file_id
 */
async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set');

  // Step 1: Get file path
  const fileInfoResp = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
  );
  if (!fileInfoResp.ok) {
    throw new Error(`getFile failed: ${fileInfoResp.status}`);
  }
  const fileInfo = (await fileInfoResp.json()) as any;
  const filePath = fileInfo.result?.file_path;
  if (!filePath) throw new Error('No file_path in getFile response');

  // Step 2: Download file
  const fileResp = await fetch(
    `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`
  );
  if (!fileResp.ok) {
    throw new Error(`File download failed: ${fileResp.status}`);
  }

  const arrayBuffer = await fileResp.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

/**
 * Send a voice message (audio buffer) back to Telegram using sendVoice.
 * Telegram accepts mp3 directly via sendVoice.
 */
async function sendTelegramVoice(chatId: number, audio: Buffer) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[telegram-webhook] TELEGRAM_BOT_TOKEN not set');
    return;
  }

  const formData = new FormData();
  formData.append('chat_id', String(chatId));
  formData.append('voice', new Blob([new Uint8Array(audio)], { type: 'audio/mpeg' }), 'response.mp3');

  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVoice`, {
    method: 'POST',
    body: formData,
  });

  if (!resp.ok) {
    console.error('[telegram-webhook] Telegram sendVoice failed:', resp.status, await resp.text());
  }
}
