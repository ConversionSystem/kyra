import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAgencyMember, requireAgencyAdmin } from '@/lib/agency/middleware';
import { isValidSlug } from '@/lib/agency/utils';
import { provisionClientGateway } from '@/lib/ovh/provisioner';
import { buildInjectionDefensePromptSuffix } from '@/lib/security/prompt-injection';
import { canAddClient, getPlanClientLimit } from '@/lib/billing/plans';
import type { CreateClientRequest } from '@/lib/agency/types';

/**
 * GET /api/agency/clients
 * List all clients for the user's agency.
 */
export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from('agency_clients')
    .select('*')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }

  return NextResponse.json({ clients });
}

/**
 * POST /api/agency/clients
 * Create a new client for the user's agency (requires admin+ role).
 */
export async function POST(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  // Parse body
  let body: CreateClientRequest;
  try {
    body = (await request.json()) as CreateClientRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, slug, industry, template_id } = body;

  // Validate required fields
  if (!name || !slug) {
    return NextResponse.json({ error: 'Missing required fields: name, slug' }, { status: 400 });
  }

  // Validate slug
  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: 'Invalid slug. Use lowercase letters, numbers, and hyphens only (2-48 chars).' },
      { status: 400 }
    );
  }

  const serviceClient = await createServiceClient();

  // Enforce plan client limit
  const { count: currentClientCount } = await serviceClient
    .from('agency_clients')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agency.id);

  const agencyPlan = (agency as any).plan || 'free';
  if (!canAddClient(agencyPlan, currentClientCount ?? 0)) {
    const limit = getPlanClientLimit(agencyPlan);
    return NextResponse.json(
      {
        error: `Your ${agencyPlan} plan allows up to ${limit} client${limit === 1 ? '' : 's'}. Upgrade to add more.`,
        code: 'PLAN_LIMIT_REACHED',
        currentCount: currentClientCount,
        limit,
        plan: agencyPlan,
      },
      { status: 403 }
    );
  }

  // Check slug uniqueness within this agency
  const { data: existingClient } = await serviceClient
    .from('agency_clients')
    .select('id')
    .eq('agency_id', agency.id)
    .eq('slug', slug)
    .limit(1)
    .single();

  if (existingClient) {
    return NextResponse.json({ error: 'A client with this slug already exists in your agency' }, { status: 409 });
  }

  // If template_id provided, fetch template to seed container_config
  let containerConfig: Record<string, unknown> = {};
  if (template_id) {
    const { data: template } = await serviceClient
      .from('agency_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (template) {
      // Replace all {{placeholder}} variables with the actual client name / industry.
      // This ensures the AI never says "Hello from {{practice_name}}!" to real customers.
      const replacePlaceholders = (text: string) =>
        text
          .replace(/\{\{[a-z_]*name[a-z_]*\}\}/gi, name)   // {{practice_name}}, {{business_name}}, etc.
          .replace(/\{\{industry\}\}/gi, industry || template.industry || 'General')
          // Leave other placeholders ({{office_hours}}, {{services_list}}, etc.) for agency to fill in
          // but mark them visually so agencies know they need editing
          .replace(/\{\{([^}]+)\}\}/g, '[Fill in: $1]');

      const processedTemplate = template.soul_template
        ? replacePlaceholders(String(template.soul_template))
        : null;

      // Extract persona: first non-header paragraph from the template
      const firstParagraph = processedTemplate
        ? processedTemplate
            .split('\n')
            .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('-'))
            .slice(0, 2)
            .join(' ')
            .slice(0, 200)
        : `AI assistant for ${name}`;

      // Default greeting based on template type
      const defaultGreeting = `Hi! Thanks for reaching out to ${name}. How can I help you today?`;

      containerConfig = {
        soul_template: processedTemplate,  // still stored for reference
        persona: firstParagraph,           // shown in Personality tab
        greeting: defaultGreeting,         // shown in Personality tab
        instructions: processedTemplate || '', // full template = detailed instructions
        skills: template.skills,
        cron_config: template.cron_config,
        template_name: template.name,
      };
    }
  }

  // If no template, seed sensible defaults so Personality tab isn't empty
  if (!template_id) {
    containerConfig = {
      persona: `Helpful AI assistant for ${name}${industry ? `, specializing in ${industry}` : ''}.`,
      greeting: `Hi! Thanks for reaching out to ${name}. How can I help you today?`,
      instructions: '',
    };
  }

  // Create client
  const { data: client, error: createError } = await serviceClient
    .from('agency_clients')
    .insert({
      agency_id: agency.id,
      name,
      slug,
      industry: industry || '',
      template_id: template_id || null,
      container_config: containerConfig,
      status: 'setup',
    })
    .select()
    .single();

  if (createError || !client) {
    console.error('Failed to create client:', createError);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }

  // Auto-provision per-client gateway on OVH (non-blocking)
  // Build SOUL.md from persona + greeting + instructions (same as Personality tab save)
  const persona = (containerConfig.persona as string) || `AI assistant for ${name}`;
  const greeting = (containerConfig.greeting as string) || '';
  const instructions = (containerConfig.instructions as string) || '';

  const soulLines: string[] = [`# SOUL.md — ${name}`, ''];
  if (persona) { soulLines.push('## Who You Are', persona, ''); }
  if (greeting) { soulLines.push('## Greeting', `When someone reaches out for the first time:`, `"${greeting}"`, ''); }
  if (instructions) { soulLines.push('## Your Instructions & Knowledge', instructions, ''); }
  soulLines.push('## Communication Style',
    '- Keep replies concise and clear (SMS/messaging)',
    '- Stay in character at all times',
    '- Ask one focused question if you need more info',
    '- Never reveal you are an AI unless directly asked');

  // Append prompt injection defense — non-negotiable security layer for all deployed agents
  const soulMd = soulLines.join('\n') + buildInjectionDefensePromptSuffix();

  const userMd = `# ${name}\n\nClient of ${agency.name}.`;

  // Auto-provision with retry — fire and forget
  const provisionWithRetry = async () => {
    const result = await provisionClientGateway(client.id, agency.id, { soulMd, userMd }, {}, name);
    if (result.success) {
      console.log(`[clients] Gateway provisioned for ${client.id}: ${result.gatewayUrl}`);
      return;
    }
    // First attempt failed — wait 5s and retry once
    console.warn(`[clients] First provision attempt failed for ${client.id}: ${result.error}. Retrying in 5s...`);
    await new Promise(r => setTimeout(r, 5000));
    const retry = await provisionClientGateway(client.id, agency.id, { soulMd, userMd }, {}, name);
    if (retry.success) {
      console.log(`[clients] Gateway provisioned on retry for ${client.id}: ${retry.gatewayUrl}`);
    } else {
      console.error(`[clients] Gateway provisioning failed after retry for ${client.id}: ${retry.error}`);
    }
  };
  provisionWithRetry().catch(err => {
    console.error(`[clients] Gateway provisioning error for ${client.id}:`, err);
  });

  return NextResponse.json(client, { status: 201 });
}
