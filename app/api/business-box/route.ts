import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { type BusinessBoxConfig, buildGenericSoul, INDUSTRY_OPTIONS } from '@/lib/business-box/business-in-a-box';
import { getTemplate, applySoulTemplate } from '@/lib/templates/industry-templates';
import { DEFAULT_AUTOPILOT_SCHEDULE } from '@/lib/autopilot/autopilot-engine';
import { AGENT_ROLES } from '@/lib/multi-agent/agent-manager';

export const dynamic = 'force-dynamic';

// POST — deploy full Business-in-a-Box
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

  const config: BusinessBoxConfig = await req.json();

  // Validate required fields
  if (!config.businessName || !config.ownerName || !config.aiName || !config.services) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 1. Build personality
  const industry = INDUSTRY_OPTIONS.find(i => i.id === config.industry);
  let soulContent = '';

  if (industry?.templateId) {
    const template = getTemplate(industry.templateId);
    if (template) {
      const vars: Record<string, string> = {
        business_name: config.businessName,
        firm_name: config.businessName,
        photographer_name: config.businessName,
        agent_name: config.ownerName,
        city: config.city || '',
        ai_name: config.aiName,
        owner_name: config.ownerName,
        services: config.services,
        services_and_pricing: config.services,
        treatments: config.services,
        practice_areas: config.services,
        practice_areas_detail: config.services,
        plans: config.services,
        packages: config.services,
        menu_highlights: config.services,
        business_hours: config.businessHours || '',
        booking_url: config.bookingUrl || '',
        special_offer: config.specialOffer || '',
        current_promo: config.specialOffer || '',
        emergency_phone: config.phone || '',
        availability: config.businessHours || '',
        brokerage: '',
        insurance_accepted: '',
        consultation_type: 'FREE',
        specialty: '',
        diag_price: '89',
        emergency_fee: '149',
        response_time: '1 hour',
        maintenance_plan: '',
        portfolio_url: config.website || '',
        turnaround: '',
        travel_radius: '50 miles',
        cuisine: '',
        max_party: '8',
        private_dining_min: '10',
        prix_fixe: '',
        class_schedule: '',
        coach_name: config.ownerName,
        providers: '',
        agent_bio: '',
        active_listings: '',
        specialties: '',
      };
      soulContent = applySoulTemplate(template.soulTemplate, vars);
    }
  }

  if (!soulContent) {
    soulContent = buildGenericSoul(config);
  }

  // 2. Determine agents to enable
  const defaultAgents = ['front-desk', 'sales'];
  const agentConfig = AGENT_ROLES.map(r => ({
    roleId: r.id,
    enabled: defaultAgents.includes(r.id),
  }));

  // 3. Autopilot schedule
  const autopilotSchedule = DEFAULT_AUTOPILOT_SCHEDULE;

  // 4. Save everything
  const { data: agency } = await sb
    .from('agencies')
    .select('settings')
    .eq('id', membership.agency_id)
    .single();

  const settings = (agency?.settings ?? {}) as Record<string, unknown>;

  const boxConfig = {
    industry: config.industry,
    businessName: config.businessName,
    ownerName: config.ownerName,
    aiName: config.aiName,
    tone: config.tone,
    deployedAt: new Date().toISOString(),
  };

  await sb
    .from('agencies')
    .update({
      settings: {
        ...settings,
        business_box: boxConfig,
        agent_config: agentConfig,
        multi_agent_routing: true,
        autopilot_enabled: true,
        autopilot_schedule: autopilotSchedule,
      },
    })
    .eq('id', membership.agency_id);

  // 5. Save template
  await sb
    .from('agency_templates')
    .upsert({
      agency_id: membership.agency_id,
      name: `${config.businessName} AI`,
      description: `Business-in-a-Box: ${config.industry}`,
      industry: config.industry,
      soul_template: soulContent,
      skills: ['book_appointment', 'tag_contact', 'create_opportunity'],
      is_public: false,
    }, { onConflict: 'id' });

  // Build embed code
  const embedId = membership.agency_id;
  const embedCode = `<script src="https://kyra.conversionsystem.com/embed.js" data-id="${embedId}"></script>`;

  return NextResponse.json({
    success: true,
    deployed: {
      personality: true,
      agents: agentConfig.filter(a => a.enabled).length,
      autopilot: autopilotSchedule.filter(a => a.enabled).length,
      reviewEngine: true,
      paymentCollection: true,
      customerMemory: true,
      webChat: true,
    },
    embedCode,
    soulPreview: soulContent.slice(0, 300) + '...',
    nextSteps: [
      'Connect your SMS channel to start receiving customer texts',
      'Add the web chat widget to your website',
      'Set your Google review link in Settings',
      'Test your AI worker with a sample conversation',
    ],
  });
}
