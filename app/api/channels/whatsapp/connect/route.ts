import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function randomBytesHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * POST /api/channels/whatsapp/connect
 * Generates a connection token for WhatsApp linking.
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
        channel_type: 'whatsapp',
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
    console.error('Failed to generate whatsapp token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }

  return NextResponse.json({
    token,
    expiresAt,
    instructions: `Send this message to Kyra on WhatsApp:\n\nCONNECT ${token}`,
  });
}

/**
 * DELETE /api/channels/whatsapp/connect
 * Disconnect WhatsApp channel.
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
    .eq('channel_type', 'whatsapp');

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
