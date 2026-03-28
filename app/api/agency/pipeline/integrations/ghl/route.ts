/**
 * /api/agency/pipeline/integrations/ghl
 * Connect, check status, configure, and disconnect GoHighLevel native integration.
 *
 * GET:    Check connection status + fetch calendars/pipelines
 * POST:   Connect (validate token, store, fetch metadata)
 * PATCH:  Update config (calendar, pipeline mapping, auto-tag settings)
 * DELETE: Disconnect
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import {
  validateGhlToken,
  getGhlCalendars,
  getGhlPipelines,
} from '@/lib/pipeline/crm-sync';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

// ─── GET: Check status ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const svc = createServiceClientWithoutCookies();
  const { data: integration } = await svc
    .from('pipeline_integrations')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('provider', 'ghl')
    .single();

  if (!integration || integration.status !== 'connected') {
    return NextResponse.json({
      connected: false,
      location_id: null,
      location_name: null,
      connected_at: null,
      config: {},
      calendars: [],
      pipelines: [],
    });
  }

  // Optionally fetch live calendars/pipelines if requested
  const fetchMeta = req.nextUrl.searchParams.get('meta') === 'true';
  let calendars: Array<{ id: string; name: string }> = [];
  let pipelines: Array<{ id: string; name: string; stages: Array<{ id: string; name: string }> }> = [];

  if (fetchMeta && integration.access_token && integration.location_id) {
    [calendars, pipelines] = await Promise.all([
      getGhlCalendars(integration.access_token, integration.location_id),
      getGhlPipelines(integration.access_token, integration.location_id),
    ]);
  }

  return NextResponse.json({
    connected: true,
    location_id: integration.location_id,
    location_name: integration.location_name,
    connected_at: integration.connected_at,
    config: integration.config || {},
    scopes: integration.scopes || [],
    last_synced_at: integration.last_synced_at,
    last_error: integration.last_error,
    calendars,
    pipelines,
  });
}

// ─── POST: Connect ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const { token, location_id } = body;

  if (!token?.trim()) {
    return NextResponse.json({ error: 'Private Integration Token is required' }, { status: 400 });
  }

  // Validate the token (pass location_id if provided for direct validation)
  const validation = await validateGhlToken(token.trim(), location_id?.trim() || undefined);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error || 'Invalid token' }, { status: 400 });
  }

  const resolvedLocationId = location_id?.trim() || validation.locationId;
  if (!resolvedLocationId) {
    return NextResponse.json({
      error: 'Could not detect Location ID automatically. Please enter it manually. In GHL: Settings → Business Profile → scroll down → Location ID (or check the URL — it\'s the string after /location/).',
    }, { status: 400 });
  }

  // Fetch calendars and pipelines for initial config
  const [calendars, pipelines] = await Promise.all([
    getGhlCalendars(token.trim(), resolvedLocationId),
    getGhlPipelines(token.trim(), resolvedLocationId),
  ]);

  // Build initial config
  const defaultConfig = {
    auto_create_contacts: true,
    auto_tag: true,
    auto_opportunity: true,
    tag_prefix: 'kyra',
    calendar_id: calendars[0]?.id || null,
    pipeline_id: pipelines[0]?.id || null,
    stage_mapping: buildDefaultStageMapping(pipelines[0]?.stages || []),
  };

  const svc = createServiceClientWithoutCookies();

  // Upsert (one integration per provider per agency)
  const { data: integration, error } = await svc
    .from('pipeline_integrations')
    .upsert({
      agency_id: agencyId,
      provider: 'ghl',
      status: 'connected',
      access_token: token.trim(),
      location_id: resolvedLocationId,
      location_name: validation.locationName || validation.companyName || 'GHL Location',
      config: defaultConfig,
      scopes: [
        'contacts.write', 'contacts.readonly',
        'conversations.write', 'conversations.readonly',
        'calendars.write', 'calendars.readonly',
        'opportunities.write', 'opportunities.readonly',
        'businesses.readonly',
      ],
      connected_at: new Date().toISOString(),
      connected_by: user.id,
    }, { onConflict: 'agency_id,provider' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync calendar_id + pipeline_id to all agency clients' container_config
  // so the AI worker knows which calendar/pipeline to use without extra lookups
  if (defaultConfig.calendar_id || defaultConfig.pipeline_id) {
    try {
      const { data: clients } = await svc
        .from('agency_clients')
        .select('id, container_config')
        .eq('agency_id', agencyId);

      if (clients) {
        for (const c of clients) {
          const existing = (c.container_config as Record<string, unknown>) || {};
          const updated: Record<string, unknown> = { ...existing };
          if (defaultConfig.calendar_id) updated.calendar_id = defaultConfig.calendar_id;
          if (defaultConfig.pipeline_id) updated.pipeline_id = defaultConfig.pipeline_id;
          await svc
            .from('agency_clients')
            .update({ container_config: updated })
            .eq('id', c.id);
        }
        console.log(`[ghl/connect] Synced calendar_id + pipeline_id to ${clients.length} client(s)`);
      }
    } catch (syncErr) {
      // Non-fatal — resolveGHLConfig falls back to pipeline_integrations anyway
      console.warn('[ghl/connect] Failed to sync IDs to container_config:', syncErr);
    }
  }

  return NextResponse.json({
    connected: true,
    location_id: resolvedLocationId,
    location_name: validation.locationName || validation.companyName,
    config: defaultConfig,
    calendars,
    pipelines,
  });
}

// ─── PATCH: Update config ─────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const { config } = body;

  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'config object required' }, { status: 400 });
  }

  const svc = createServiceClientWithoutCookies();

  // Merge with existing config
  const { data: existing } = await svc
    .from('pipeline_integrations')
    .select('config')
    .eq('agency_id', agencyId)
    .eq('provider', 'ghl')
    .single();

  const mergedConfig = { ...(existing?.config || {}), ...config };

  const { data: updated, error } = await svc
    .from('pipeline_integrations')
    .update({ config: mergedConfig })
    .eq('agency_id', agencyId)
    .eq('provider', 'ghl')
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync updated calendar_id / pipeline_id to client container_configs
  if (mergedConfig.calendar_id || mergedConfig.pipeline_id) {
    try {
      const { data: clients } = await svc
        .from('agency_clients')
        .select('id, container_config')
        .eq('agency_id', agencyId);

      if (clients) {
        for (const c of clients) {
          const existingCc = (c.container_config as Record<string, unknown>) || {};
          const updatedCc: Record<string, unknown> = { ...existingCc };
          if (mergedConfig.calendar_id) updatedCc.calendar_id = mergedConfig.calendar_id;
          if (mergedConfig.pipeline_id) updatedCc.pipeline_id = mergedConfig.pipeline_id;
          await svc
            .from('agency_clients')
            .update({ container_config: updatedCc })
            .eq('id', c.id);
        }
      }
    } catch {
      // Non-fatal
    }
  }

  return NextResponse.json({ config: updated?.config });
}

// ─── DELETE: Disconnect ───────────────────────────────────────────────────────

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const svc = createServiceClientWithoutCookies();

  await svc
    .from('pipeline_integrations')
    .update({
      status: 'disconnected',
      access_token: null,
      refresh_token: null,
      connected_at: null,
    })
    .eq('agency_id', agencyId)
    .eq('provider', 'ghl');

  return NextResponse.json({ disconnected: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Auto-map Kyra stages to GHL pipeline stages based on name matching.
 */
function buildDefaultStageMapping(ghlStages: Array<{ id: string; name: string }>): Record<string, string> {
  const mapping: Record<string, string> = {};
  if (!ghlStages.length) return mapping;

  const nameMap = new Map(ghlStages.map(s => [s.name.toLowerCase(), s.id]));

  // Try common stage name patterns
  const kyraToGhl: Array<[string, string[]]> = [
    ['messaged', ['contacted', 'outreach', 'messaged', 'sent', 'reached out']],
    ['replied', ['replied', 'responded', 'engaged', 'response']],
    ['interested', ['interested', 'qualified', 'warm', 'hot']],
    ['booked', ['booked', 'appointment', 'demo', 'meeting', 'scheduled']],
    ['closed', ['closed', 'won', 'closed won', 'converted', 'customer']],
  ];

  for (const [kyraStage, ghlNames] of kyraToGhl) {
    for (const name of ghlNames) {
      const match = nameMap.get(name);
      if (match) {
        mapping[kyraStage] = match;
        break;
      }
    }
    // Fallback: if no match, try partial match
    if (!mapping[kyraStage]) {
      for (const [ghlName, ghlId] of nameMap) {
        for (const name of ghlNames) {
          if (ghlName.includes(name) || name.includes(ghlName)) {
            mapping[kyraStage] = ghlId;
            break;
          }
        }
        if (mapping[kyraStage]) break;
      }
    }
  }

  return mapping;
}
