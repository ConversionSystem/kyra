import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agency/sites/[id]
 * Get site details including page count.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  const { data: site, error } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (error || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: site });
}

/**
 * PATCH /api/agency/sites/[id]
 * Update wizard data or site settings.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Verify ownership
  const { data: existing } = await supabase
    .from('client_sites')
    .select('id')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // Allowlist of updatable fields
  const allowedFields = [
    'business_name', 'industry', 'phone', 'address', 'owner_name', 'owner_story',
    'years_in_business', 'license', 'services', 'cities', 'hours', 'rating', 'review_count',
    'logo_url', 'photos', 'color_primary', 'color_secondary', 'design_style', 'tagline',
    'ai_name', 'ai_tone', 'ai_capabilities', 'booking_url', 'email',
    'template_id', 'site_domain', 'site_subdomain',
    // Navigation & Footer
    'nav_links', 'footer_tagline', 'social_links',
    // Settings page fields
    'ga4_id', 'white_label', 'google_rating', 'rating', 'google_review_url',
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  const { data: site, error } = await supabase
    .from('client_sites')
    .update(updates)
    .eq('id', siteId)
    .select()
    .single();

  if (error || !site) {
    console.error('[sites] Failed to update site:', error);
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: site });
}

/**
 * DELETE /api/agency/sites/[id]
 * Delete a site and all its pages (cascade).
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  // Verify ownership + get subdomain for VPS cleanup
  const { data: existing } = await supabase
    .from('client_sites')
    .select('id, site_subdomain')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // Pages are cascade-deleted via FK constraint
  const { error } = await supabase
    .from('client_sites')
    .delete()
    .eq('id', siteId);

  if (error) {
    console.error('[sites] Failed to delete site:', error);
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
  }

  // Remove VPS files (fire-and-forget — DB is already deleted, don't fail on VPS cleanup error)
  const subdomain = (existing as { id: string; site_subdomain?: string | null }).site_subdomain;
  if (subdomain) {
    const provisionerUrl = process.env.OVH_PROVISIONER_URL || 'http://15.204.91.157:9090';
    const provisionerSecret = process.env.OVH_PROVISIONER_SECRET || '';
    fetch(`${provisionerUrl}/sites/${encodeURIComponent(subdomain)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${provisionerSecret}` },
    }).catch((err) => {
      console.error('[sites/delete] VPS cleanup failed (non-fatal):', err.message);
    });
  }

  return NextResponse.json({ ok: true, data: { deleted: true } });
}
