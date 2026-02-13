import { NextRequest, NextResponse } from 'next/server';
import { processChannelMessage } from '@/lib/channels/router';
import { sendDiscordMessage } from '@/lib/channels/discord';
import { createClient } from '@supabase/supabase-js';

const DISCORD_PUBLIC_KEY = process.env.DISCORD_APP_ID; // Discord app public key for signature verification

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Verify Discord interaction signature using Ed25519.
 * Discord requires this for all interaction endpoints.
 */
async function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      hexToUint8Array(publicKey),
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );

    const message = new TextEncoder().encode(timestamp + body);
    const sig = hexToUint8Array(signature);

    return await crypto.subtle.verify('Ed25519', key, sig, message);
  } catch (err) {
    console.error('[discord-webhook] signature verification error:', err);
    return false;
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * POST /api/channels/discord/webhook
 * Discord Interactions endpoint — handles PING, and MESSAGE_CREATE via gateway events forwarded here.
 * Also handles Discord bot gateway events if using an HTTP-based bot approach.
 */
export async function POST(request: NextRequest) {
  console.log('[discord-webhook] handler called');

  const body = await request.text();
  const signature = request.headers.get('x-signature-ed25519') || '';
  const timestamp = request.headers.get('x-signature-timestamp') || '';

  // Verify signature if public key is configured
  if (DISCORD_PUBLIC_KEY && signature && timestamp) {
    const isValid = await verifyDiscordSignature(body, signature, timestamp, DISCORD_PUBLIC_KEY);
    if (!isValid) {
      console.error('[discord-webhook] invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let interaction: any;
  try {
    interaction = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Discord PING verification (type 1) — required for interaction endpoint setup
  if (interaction.type === 1) {
    return NextResponse.json({ type: 1 });
  }

  // Handle MESSAGE_CREATE events (type 0 in gateway, but we handle as interaction type 2 or custom)
  // For bot-based approach: handle the message content directly
  const msg = interaction;

  // Ignore bot messages
  if (msg.author?.bot) {
    return NextResponse.json({ ok: true });
  }

  const channelId = msg.channel_id;
  const discordUserId = msg.author?.id;
  const content = msg.content?.trim();

  if (!channelId || !discordUserId || !content) {
    return NextResponse.json({ ok: true });
  }

  console.log('[discord-webhook] message from:', discordUserId, 'content:', content);

  const supabase = getSupabase();

  // Handle !connect <token> command
  if (content.startsWith('!connect ')) {
    const token = content.replace('!connect ', '').trim().toUpperCase();

    const { data: channel } = await supabase
      .from('user_channels')
      .select('*')
      .eq('channel_type', 'discord')
      .eq('connection_token', token)
      .eq('status', 'pending')
      .single();

    if (!channel) {
      await sendDiscordMessage(channelId, 'Invalid or expired token. Generate a new one at kyra.conversionsystem.com');
      return NextResponse.json({ ok: true });
    }

    if (channel.token_expires_at && new Date(channel.token_expires_at) < new Date()) {
      await sendDiscordMessage(channelId, 'Token expired. Generate a new one in Settings > Channels.');
      return NextResponse.json({ ok: true });
    }

    await supabase.from('user_channels').update({
      channel_user_id: discordUserId,
      status: 'connected',
      verified: true,
      connected_at: new Date().toISOString(),
      connection_token: null,
      token_expires_at: null,
      metadata: {
        username: msg.author?.username,
        discriminator: msg.author?.discriminator,
        channelId,
        guildId: msg.guild_id,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', channel.id);

    await sendDiscordMessage(channelId, 'Connected! You can now chat with Kyra here.');
    return NextResponse.json({ ok: true });
  }

  // Resolve user from verified channel link
  const { data: link } = await supabase
    .from('user_channels')
    .select('user_id')
    .eq('channel_type', 'discord')
    .eq('channel_user_id', discordUserId)
    .eq('verified', true)
    .single();

  if (!link) {
    await sendDiscordMessage(channelId,
      "I don't recognize your account. Visit kyra.conversionsystem.com to sign up, then link your Discord in Settings > Channels."
    );
    return NextResponse.json({ ok: true });
  }

  // Update last_message_at
  await supabase.from('user_channels')
    .update({ last_message_at: new Date().toISOString() })
    .eq('channel_type', 'discord')
    .eq('channel_user_id', discordUserId);

  // Process through shared channel router
  try {
    const responseText = await processChannelMessage(link.user_id, content, 'discord', msg.id);
    await sendDiscordMessage(channelId, responseText);
  } catch (err: any) {
    console.error('[discord-webhook] processChannelMessage error:', err?.message);
    await sendDiscordMessage(channelId, "Sorry, I'm having trouble thinking right now. Please try again.");
  }

  return NextResponse.json({ ok: true });
}
