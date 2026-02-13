import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAgencyMember, requireAgencyAdmin } from '@/lib/agency/middleware';
import { isValidSlug } from '@/lib/agency/utils';
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
      containerConfig = {
        soul_template: template.soul_template,
        skills: template.skills,
        cron_config: template.cron_config,
        template_name: template.name,
      };
    }
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

  return NextResponse.json(client, { status: 201 });
}
