import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveGatewayForUser } from '@/lib/ovh/gateway-resolver';
import { getGatewayConfig, patchGatewayConfig } from '@/lib/ovh/provisioner';

/**
 * GET /api/openclaw/channels?clientId=xxx
 * Get channel configuration from the client's gateway openclaw.json.
 * Since OpenClaw gateway has no HTTP REST API for channels,
 * we read the config from the container via the provisioner.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get('clientId');

  try {
    const resolved = await resolveGatewayForUser(user.id, clientId);
    if (!resolved) return NextResponse.json({ ok: false, error: { message: 'Gateway not provisioned' } }, { status: 503 });

    // Read openclaw.json from the container via provisioner
    const result = await getGatewayConfig(resolved.clientId);
    if (!result) {
      return NextResponse.json({ ok: true, channels: {} });
    }

    const config = result.config as Record<string, unknown>;
    const channels = (config.channels || {}) as Record<string, unknown>;

    // Build channel status map
    const channelStatus: Record<string, { configured: boolean; hasToken: boolean }> = {};
    
    for (const [name, channelConfig] of Object.entries(channels)) {
      const cfg = channelConfig as Record<string, unknown>;
      const hasToken = !!(cfg.botToken || cfg.token || cfg.phoneNumber);
      channelStatus[name] = {
        configured: cfg.enabled !== false,
        hasToken,
      };
    }

    return NextResponse.json({ ok: true, channels: channelStatus });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}

/**
 * POST /api/openclaw/channels
 * Connect a new channel by patching the gateway's openclaw.json.
 * Body: { channel: string, config: object, clientId?: string }
 * 
 * This patches channels.<channel> in openclaw.json and restarts the container.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { channel, config: channelConfig } = body;
    const clientId = body.clientId || request.nextUrl.searchParams.get('clientId');

    if (!channel || typeof channel !== 'string') {
      return NextResponse.json({ ok: false, error: { message: 'channel name required' } }, { status: 400 });
    }

    const resolved = await resolveGatewayForUser(user.id, clientId);
    if (!resolved) return NextResponse.json({ ok: false, error: { message: 'Gateway not provisioned' } }, { status: 503 });

    // Build the channel config patch
    const channelPatch: Record<string, unknown> = {
      enabled: true,
      ...channelConfig,
    };

    // Telegram-specific defaults
    // dmPolicy: "open" = any customer can DM the bot (correct for customer service bots)
    // IMPORTANT: dmPolicy="open" requires allowFrom: ["*"] — OpenClaw won't start without it
    if (channel === 'telegram') {
      channelPatch.dmPolicy = channelPatch.dmPolicy || 'open';
      channelPatch.groupPolicy = channelPatch.groupPolicy || 'open';
      channelPatch.streamMode = channelPatch.streamMode || 'partial';
      // Required by OpenClaw when dmPolicy="open"
      if (channelPatch.dmPolicy === 'open') {
        channelPatch.allowFrom = ['*'];
      }
    }

    // Discord-specific defaults
    if (channel === 'discord') {
      channelPatch.enabled = true;
    }

    // Patch the gateway config via provisioner
    const result = await patchGatewayConfig(resolved.clientId, {
      channels: {
        [channel]: channelPatch,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: { message: result.error || 'Failed to update config' } }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `${channel} channel configured. Gateway is restarting to apply changes (~30 seconds).`,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}

/**
 * DELETE /api/openclaw/channels
 * Disconnect a channel by disabling it in openclaw.json.
 * Body: { channel: string, clientId?: string }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { channel } = body;
    const clientId = body.clientId || request.nextUrl.searchParams.get('clientId');

    if (!channel) {
      return NextResponse.json({ ok: false, error: { message: 'channel name required' } }, { status: 400 });
    }

    const resolved = await resolveGatewayForUser(user.id, clientId);
    if (!resolved) return NextResponse.json({ ok: false, error: { message: 'Gateway not provisioned' } }, { status: 503 });

    // Disable the channel
    const result = await patchGatewayConfig(resolved.clientId, {
      channels: {
        [channel]: { enabled: false },
      },
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: { message: result.error || 'Failed to update config' } }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: `${channel} channel disabled.` });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: String(error) } }, { status: 500 });
  }
}
