import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { generateSiteContent } from '@/lib/sites/content-engine';
import type { WizardData } from '@/lib/sites/types';

/**
 * GET /api/agency/sites
 * List all sites for the current agency.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();
  const clientId = request.nextUrl.searchParams.get('clientId');

  let query = supabase
    .from('client_sites')
    .select('*')
    .eq('agency_id', auth.data.agency.id)
    .order('created_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data: sites, error } = await query;

  if (error) {
    console.error('[sites] Failed to list sites:', error);
    return NextResponse.json({ error: 'Failed to list sites' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: sites });
}

/**
 * POST /api/agency/sites
 * Create a new draft site. Body should contain wizard data.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let body: Partial<WizardData> & { client_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.business_name || !body.industry) {
    return NextResponse.json(
      { error: 'Missing required fields: business_name, industry' },
      { status: 400 }
    );
  }

  const supabase = createServiceClientWithoutCookies();

  // If client_id provided, verify it belongs to this agency
  if (body.client_id) {
    const { data: client } = await supabase
      .from('agency_clients')
      .select('id')
      .eq('id', body.client_id)
      .eq('agency_id', auth.data.agency.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found in your agency' }, { status: 404 });
    }
  }

  const { data: site, error } = await supabase
    .from('client_sites')
    .insert({
      agency_id: auth.data.agency.id,
      client_id: body.client_id || null,
      business_name: body.business_name,
      industry: body.industry,
      phone: body.phone || null,
      address: body.address || null,
      owner_name: body.owner_name || null,
      owner_story: body.owner_story || null,
      years_in_business: body.years_in_business || null,
      license: body.license || null,
      services: body.services || [],
      cities: body.cities || [],
      hours: body.hours || null,
      logo_url: body.logo_url || null,
      photos: body.photos || [],
      color_primary: body.color_primary || '#dc2626',
      color_secondary: body.color_secondary || '#111827',
      design_style: body.design_style || 'modern-dark',
      tagline: body.tagline || null,
      ai_name: body.ai_name || null,
      ai_tone: body.ai_tone || 'professional',
      ai_capabilities: body.ai_capabilities || null,
      booking_url: body.booking_url || null,
      rating: body.google_rating != null ? Number(body.google_rating) : null,
      review_count: body.review_count != null ? Number(body.review_count) : null,
      template_id: 'generic', // only template supported
      status: 'draft',
    })
    .select()
    .single();

  if (error || !site) {
    console.error('[sites] Failed to create site:', error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }

  // Optional: auto-trigger content generation (used by bulk generation)
  const autoGenerate = (body as Record<string, unknown>).auto_generate === true;
  if (autoGenerate) {
    generateSiteContent(site.id).catch((err) => {
      console.error(`[sites] Auto-generate failed for ${site.id}:`, err);
    });
  }

  return NextResponse.json({ ok: true, data: site }, { status: 201 });
}
