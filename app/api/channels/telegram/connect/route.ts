import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

/**
 * POST /api/channels/telegram/connect
 * Generates a unique connection token for the user to send to @KyraAIBot on Telegram.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generate a short, user-friendly token (6 chars hex)
  const token = randomBytes(3).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  // Upsert the channel record
  const { data, error } = await supabase
    .from('user_channels')
    .upsert(
      {
        user_id: user.id,
        channel_type: 'telegram',
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
    console.error('Failed to generate telegram token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }

  return NextResponse.json({
    token,
    expiresAt,
    instructions: `Send this message to @KyraAIBot on Telegram:\n\n/connect ${token}`,
  });
}

/**
 * DELETE /api/channels/telegram/connect
 * Disconnect Telegram channel.
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
    .eq('channel_type', 'telegram');

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
