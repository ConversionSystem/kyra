import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AGENT_ROLES, routeToAgent, buildAgentPrompt } from '@/lib/multi-agent/agent-manager';

export const dynamic = 'force-dynamic';

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

  // Get saved agent config from agency settings
  const { data: agency } = await sb
    .from('agencies')
    .select('settings, name')
    .eq('id', membership.agency_id)
    .single();

  const savedConfig = (agency?.settings as Record<string, unknown>)?.agent_config as Array<{
    roleId: string;
    enabled: boolean;
    customPersonality?: string;
  }> | undefined;

  // Merge saved config with role definitions
  const agents = AGENT_ROLES.map(role => {
    const saved = savedConfig?.find(c => c.roleId === role.id);
    return {
      ...role,
      enabled: saved?.enabled ?? (role.id === 'front-desk'),
      customPersonality: saved?.customPersonality ?? null,
    };
  });

  return NextResponse.json({
    agents,
    businessName: agency?.name ?? '',
    routingEnabled: (agency?.settings as Record<string, unknown>)?.multi_agent_routing === true,
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

  if (action === 'update_agent') {
    const { roleId, enabled, customPersonality } = body;
    
    // Get current settings
    const { data: agency } = await sb
      .from('agencies')
      .select('settings')
      .eq('id', membership.agency_id)
      .single();

    const settings = (agency?.settings ?? {}) as Record<string, unknown>;
    const config = (settings.agent_config ?? []) as Array<{
      roleId: string;
      enabled: boolean;
      customPersonality?: string;
    }>;

    // Update or add agent config
    const idx = config.findIndex(c => c.roleId === roleId);
    const update = { roleId, enabled, customPersonality };
    if (idx >= 0) {
      config[idx] = update;
    } else {
      config.push(update);
    }

    await sb
      .from('agencies')
      .update({ settings: { ...settings, agent_config: config } })
      .eq('id', membership.agency_id);

    return NextResponse.json({ success: true });
  }

  if (action === 'toggle_routing') {
    const { enabled } = body;
    
    const { data: agency } = await sb
      .from('agencies')
      .select('settings')
      .eq('id', membership.agency_id)
      .single();

    const settings = (agency?.settings ?? {}) as Record<string, unknown>;
    
    await sb
      .from('agencies')
      .update({ settings: { ...settings, multi_agent_routing: enabled } })
      .eq('id', membership.agency_id);

    return NextResponse.json({ success: true });
  }

  if (action === 'test_routing') {
    const { message } = body;
    const agent = routeToAgent(message);
    
    const { data: agency } = await sb
      .from('agencies')
      .select('name')
      .eq('id', membership.agency_id)
      .single();

    const prompt = buildAgentPrompt(
      'You are an AI worker.',
      agent,
      agency?.name ?? 'My Business',
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
