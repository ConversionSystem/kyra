import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function randomBytesHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const DISCORD_APP_ID = process.env.DISCORD_APP_ID;

/**
 * POST /api/channels/discord/connect
 * Generates a connection token and returns the bot invite URL.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = randomBytesHex(3).toUpperCase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('user_channels')
    .upsert(
      {
        user_id: user.id,
        channel_type: 'discord',
        connection_token: token,
        token_expires_at: expiresAt,
        status: 'pending',
        verified: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,channel_type' }
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to generate discord token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }

  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_APP_ID}&permissions=2048&scope=bot`;

  return NextResponse.json({
    token,
    expiresAt,
    inviteUrl,
    instructions: `1. Add the Kyra bot to your server using the invite link\n2. In any channel, send: !connect ${token}`,
  });
}

/**
 * DELETE /api/channels/discord/connect
 * Disconnect Discord channel.
 */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('user_channels')
    .update({
      status: 'disconnected',
      verified: false,
      channel_user_id: null,
      connection_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('channel_type', 'discord');

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
