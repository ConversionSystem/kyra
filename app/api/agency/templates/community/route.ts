/**
 * GET /api/agency/templates/community — Browse community-created templates
 * POST /api/agency/templates/community — Publish a template to the community
 *
 * Two-sided marketplace: agencies create templates, other agencies install them.
 * Creator earns credits when their template is installed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember, requireAgencyAdmin } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'popular'; // popular, newest, name
  const industry = searchParams.get('industry') || '';

  let dbQuery = supabase
    .from('agency_templates')
    .select('id, name, industry, description, icon, tags, agency_id, is_community, installs, created_at, creator_name')
    .eq('is_community', true);

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,industry.ilike.%${query}%`);
  }

  if (industry) {
    dbQuery = dbQuery.ilike('industry', `%${industry}%`);
  }

  switch (sort) {
    case 'newest':
      dbQuery = dbQuery.order('created_at', { ascending: false });
      break;
    case 'name':
      dbQuery = dbQuery.order('name', { ascending: true });
      break;
    case 'popular':
    default:
      dbQuery = dbQuery.order('installs', { ascending: false });
      break;
  }

  const { data: templates, error } = await dbQuery.limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: templates || [] });
}

export async function POST(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();
  const body = await request.json();

  const {
    name,
    industry,
    description,
    icon,
    tags,
    soul_template,
    variables,
    suggested_tools,
    sample_faqs,
    automations,
  } = body as {
    name: string;
    industry: string;
    description: string;
    icon?: string;
    tags?: string[];
    soul_template: string;
    variables?: Array<Record<string, unknown>>;
    suggested_tools?: string[];
    sample_faqs?: Array<Record<string, unknown>>;
    automations?: Array<Record<string, unknown>>;
  };

  if (!name || !industry || !description || !soul_template) {
    return NextResponse.json(
      { error: 'Missing required fields: name, industry, description, soul_template' },
      { status: 400 },
    );
  }

  // Check for duplicate name from this agency
  const { data: existing } = await supabase
    .from('agency_templates')
    .select('id')
    .eq('agency_id', agency.id)
    .eq('name', name)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'You already have a template with this name. Edit it instead.' },
      { status: 409 },
    );
  }

  // Get agency name for creator attribution
  const { data: agencyData } = await supabase
    .from('agencies')
    .select('name')
    .eq('id', agency.id)
    .single();

  const { data: template, error } = await supabase
    .from('agency_templates')
    .insert({
      name,
      industry,
      description,
      icon: icon || '🤖',
      tags: tags || [],
      soul_template,
      variables: variables || [],
      suggested_tools: suggested_tools || [],
      sample_faqs: sample_faqs || [],
      automations: automations || [],
      agency_id: agency.id,
      is_community: true,
      installs: 0,
      creator_name: agencyData?.name || 'Anonymous',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, template });
}
