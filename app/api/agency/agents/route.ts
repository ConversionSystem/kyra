import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AGENT_ROLES, routeToAgent, buildAgentPrompt } from '@/lib/multi-agent/agent-manager';

export const dynamic = 'force-dynamic';

// ── Helper: resolve config scope ─────────────────────────────────────────────
// If clientId is provided, read/write from agency_clients.container_config.agent_config
// so each client can have its own team setup.
// Otherwise fall back to agencies.settings (agency-wide default).

async function getConfigScope(
  sb: Awaited<ReturnType<typeof createClient>>,
  agencyId: string,
  clientId?: string | null,
): Promise<{
  settings: Record<string, unknown>;
  savedConfig: Array<{ roleId: string; enabled: boolean; customPersonality?: string }> | undefined;
  businessName: string;
  routingEnabled: boolean;
}> {
  if (clientId) {
    const { data: client } = await sb
      .from('agency_clients')
      .select('name, container_config')
      .eq('id', clientId)
      .eq('agency_id', agencyId)
      .single();

    const cfg = (client?.container_config ?? {}) as Record<string, unknown>;
    return {
      settings: cfg,
      savedConfig: cfg.agent_config as Array<{ roleId: string; enabled: boolean; customPersonality?: string }> | undefined,
      businessName: client?.name ?? '',
      routingEnabled: cfg.multi_agent_routing === true,
    };
  }

  const { data: agency } = await sb
    .from('agencies')
    .select('settings, name')
    .eq('id', agencyId)
    .single();

  const settings = (agency?.settings ?? {}) as Record<string, unknown>;
  return {
    settings,
    savedConfig: settings.agent_config as Array<{ roleId: string; enabled: boolean; customPersonality?: string }> | undefined,
    businessName: agency?.name ?? '',
    routingEnabled: settings.multi_agent_routing === true,
  };
}

async function saveConfigScope(
  sb: Awaited<ReturnType<typeof createClient>>,
  agencyId: string,
  patch: Record<string, unknown>,
  clientId?: string | null,
): Promise<{ error: string | null }> {
  if (clientId) {
    // Read current container_config, deep-merge patch
    const { data: client } = await sb
      .from('agency_clients')
      .select('container_config')
      .eq('id', clientId)
      .eq('agency_id', agencyId)
      .single();

    const existing = (client?.container_config ?? {}) as Record<string, unknown>;
    const { error } = await sb
      .from('agency_clients')
      .update({ container_config: { ...existing, ...patch } })
      .eq('id', clientId);
    return { error: error?.message ?? null };
  }

  const { data: agency } = await sb
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  const existing = (agency?.settings ?? {}) as Record<string, unknown>;
  const { error } = await sb
    .from('agencies')
    .update({ settings: { ...existing, ...patch } })
    .eq('id', agencyId);
  return { error: error?.message ?? null };
}

// GET — list agent roles + current config
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: membership } = await sb
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const clientId = req.nextUrl.searchParams.get('clientId') || null;
  const scope = await getConfigScope(sb, membership.agency_id, clientId);

  // Merge saved config with role definitions
  const agents = AGENT_ROLES.map(role => {
    const saved = scope.savedConfig?.find(c => c.roleId === role.id);
    return {
      ...role,
      enabled: saved?.enabled ?? (role.id === 'front-desk'),
      customPersonality: saved?.customPersonality ?? null,
    };
  });

  return NextResponse.json({
    agents,
    businessName: scope.businessName,
    routingEnabled: scope.routingEnabled,
  });
}

// POST — update agent config
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: membership } = await sb
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const { action } = body;
  const clientId: string | null = body.clientId ?? null;

  if (action === 'update_agent') {
    const { roleId, enabled, customPersonality } = body;

    const scope = await getConfigScope(sb, membership.agency_id, clientId);
    const config = (scope.settings.agent_config ?? []) as Array<{
      roleId: string; enabled: boolean; customPersonality?: string;
    }>;

    const idx = config.findIndex(c => c.roleId === roleId);
    const entry = { roleId, enabled, ...(customPersonality != null && { customPersonality }) };
    if (idx >= 0) config[idx] = entry;
    else config.push(entry);

    const { error } = await saveConfigScope(sb, membership.agency_id, { agent_config: config }, clientId);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'toggle_routing') {
    const { enabled } = body;
    const { error } = await saveConfigScope(sb, membership.agency_id, { multi_agent_routing: enabled }, clientId);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'test_routing') {
    const { message } = body;
    const agent = routeToAgent(message);

    // Load saved config to pick up customPersonality for accurate test preview
    const scope = await getConfigScope(sb, membership.agency_id, clientId);
    const savedAgent = scope.savedConfig?.find(c => c.roleId === agent.id);

    const prompt = buildAgentPrompt(
      'You are an AI worker.',
      agent,
      scope.businessName || 'My Business',
      savedAgent?.customPersonality,
    );

    return NextResponse.json({
      routedTo: {
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        description: agent.description,
      },
      generatedPromptPreview: prompt.slice(0, 500),
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
