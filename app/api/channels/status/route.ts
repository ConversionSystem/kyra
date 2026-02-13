import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/channels/status
 * Returns connection status for all channels for the current user.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: channels, error } = await supabase
    .from('user_channels')
    .select('id, channel_type, status, verified, connected_at, last_message_at, metadata, created_at')
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to fetch channel status:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }

  // Build a map of all channel types with their status
  const channelMap: Record<string, any> = {
    telegram: { status: 'disconnected', verified: false },
    whatsapp: { status: 'disconnected', verified: false },
    discord: { status: 'disconnected', verified: false },
  };

  for (const ch of channels || []) {
    channelMap[ch.channel_type] = {
      id: ch.id,
      status: ch.status,
      verified: ch.verified,
      connectedAt: ch.connected_at,
      lastMessageAt: ch.last_message_at,
      metadata: ch.metadata,
    };
  }

  return NextResponse.json({ channels: channelMap });
}
