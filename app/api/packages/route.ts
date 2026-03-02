import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { HOME_SERVICE_PACKAGES, getPackage } from '@/lib/packages/home-services';
import { getTemplate, applySoulTemplate } from '@/lib/templates/industry-templates';
import { getSchedule, DEFAULT_AUTOPILOT_SCHEDULE } from '@/lib/autopilot/autopilot-engine';

export const dynamic = 'force-dynamic';

// GET — list packages or get detail
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  if (id) {
    const pkg = getPackage(id);
    if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    return NextResponse.json({ package: pkg });
  }

  return NextResponse.json({
    packages: HOME_SERVICE_PACKAGES.map(p => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      industry: p.industry,
      tagline: p.tagline,
      description: p.description,
      featureCount: p.features.length,
      stepCount: p.setupSteps.length,
    })),
  });
}

// POST — activate a package (applies template + autopilot + agents)
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
  const { packageId, variables } = body;

  const pkg = getPackage(packageId);
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  // 1. Apply template
  const template = getTemplate(pkg.templateId);
  let soulContent = '';
  if (template && variables) {
    soulContent = applySoulTemplate(template.soulTemplate, variables);
  }

  // 2. Configure agents
  const agentConfig = pkg.enabledAgents.map(roleId => ({
    roleId,
    enabled: true,
  }));

  // 3. Get autopilot schedule
  const autopilotSchedule = DEFAULT_AUTOPILOT_SCHEDULE;

  // 4. Save everything to agency settings
  const { data: agency } = await sb
    .from('agencies')
    .select('settings')
    .eq('id', membership.agency_id)
    .single();

  const settings = (agency?.settings ?? {}) as Record<string, unknown>;

  await sb
    .from('agencies')
    .update({
      settings: {
        ...settings,
        active_package: pkg.id,
        agent_config: agentConfig,
        multi_agent_routing: true,
        autopilot_enabled: true,
        autopilot_schedule: autopilotSchedule,
      },
    })
    .eq('id', membership.agency_id);

  // 5. Save template
  if (soulContent) {
    await sb
      .from('agency_templates')
      .upsert({
        agency_id: membership.agency_id,
        name: `${pkg.name} Template`,
        description: pkg.description,
        industry: pkg.industry,
        soul_template: soulContent,
        skills: template?.suggestedTools ?? [],
        is_public: false,
      }, { onConflict: 'id' });
  }

  return NextResponse.json({
    success: true,
    activated: {
      package: pkg.name,
      templateApplied: !!soulContent,
      agentsEnabled: pkg.enabledAgents.length,
      autopilotActions: autopilotSchedule.filter(a => a.enabled).length,
    },
    setupSteps: pkg.setupSteps,
    message: `${pkg.name} package activated! Follow the setup steps to finish configuration.`,
  });
}
