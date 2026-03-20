/**
 * POST /api/agency/sites/[id]/build-internal
 *
 * Internal-only endpoint called by the content engine after page generation completes.
 * Runs the VPS build in its OWN waitUntil + maxDuration window, decoupled from
 * the generate route. This lets us have two separate 5-minute windows:
 *   1) generate route: generates pages (~2-3 min)
 *   2) build-internal: VPS Next.js compile + deploy (~2-4 min)
 *
 * Auth: Bearer token from KYRA_API_SECRET env var (internal only, never user-facing).
 */

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { resolvePhotos } from '@/lib/sites/unsplash';

export const maxDuration = 300;

// SECURITY: Provisioner IP fallback should be moved to env-only in production.
// Empty-string fallback for secrets means auth is bypassed if env vars are missing.
const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'http://15.204.91.157:9090';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET || '';
const KYRA_API_SECRET = process.env.KYRA_API_SECRET || '';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  // Verify internal auth
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!KYRA_API_SECRET || token !== KYRA_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: siteId } = await params;
  const supabase = createServiceClientWithoutCookies();

  waitUntil(
    runBuild(siteId, supabase).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[build-internal] Build failed for site ${siteId}:`, message);
      supabase
        .from('client_sites')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', siteId)
        .then(() => {}, () => {});
    })
  );

  return NextResponse.json({ ok: true });
}

async function runBuild(siteId: string, supabase: ReturnType<typeof createServiceClientWithoutCookies>) {
  // Fetch site data
  const { data: site, error: siteErr } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (siteErr || !site) throw new Error(`Site not found: ${siteId}`);

  const domain = site.site_domain || site.site_subdomain;
  if (!domain) throw new Error(`No domain for site ${siteId}`);

  // Fetch generated pages
  const { data: pages, error: pagesErr } = await supabase
    .from('site_pages')
    .select('*')
    .eq('site_id', siteId)
    .order('page_type');

  if (pagesErr || !pages?.length) throw new Error('No pages found for site');

  const services = (site.services || []) as Array<{ name: string; slug: string; description?: string }>;
  const cities = (site.cities || []) as Array<{ name: string; slug: string; state?: string }>;
  const address = site.address || {};

  const phone = site.phone || '';
  const phoneDigits = phone.replace(/[^0-9]/g, '');

  const constants = {
    name: site.business_name || '',
    phone,
    phoneHref: phoneDigits ? `tel:+${phoneDigits.length === 10 ? '1' : ''}${phoneDigits}` : '',
    email: `info@${domain}`,
    address: [address.street, address.city, address.state, address.zip].filter(Boolean).join(', '),
    license: site.license || '',
    rating: site.rating || 5.0,
    reviewCount: site.review_count || 0,
    yearsInBusiness: site.years_in_business || 1,
    hours: site.hours || {},
    coordinates: { lat: address.lat || 0, lng: address.lng || 0 },
    tagline: site.tagline || '',
    url: `https://${domain}`,
    bookingUrl: site.booking_url || '',
    googleReviewUrl: (site as Record<string, unknown>).google_review_url || '',
    industry: site.industry || '',
    emergencyText: site.emergency_247 ? '24/7 Emergency Service Available' : '',
    services,
    serviceAreas: cities,
  };

  const theme = {
    colorPrimary: site.color_primary || '#dc2626',
    colorSecondary: site.color_secondary || '#111827',
    designStyle: site.design_style || 'modern-dark',
    bookingUrl: site.booking_url || null,
  };

  const pagesData = pages.map((p: {
    slug: string; page_type: string; title: string;
    meta_title: string; meta_description: string;
    hero_h1: string; hero_subtitle: string;
    content_sections: unknown; faq: unknown; schema_markup: unknown;
  }) => ({
    slug: p.slug,
    type: p.page_type,
    title: p.title,
    metaTitle: p.meta_title,
    metaDescription: p.meta_description,
    heroH1: p.hero_h1,
    heroSubtitle: p.hero_subtitle,
    sections: p.content_sections,
    faq: p.faq,
    schema: p.schema_markup,
  }));

  // Update status to deploying
  await supabase
    .from('client_sites')
    .update({ status: 'deploying', updated_at: new Date().toISOString() })
    .eq('id', siteId);

  console.log(`[build-internal] Calling VPS for site ${siteId} (${domain}), ${pages.length} pages`);

  // Call VPS provisioner — up to 4 min for Next.js build
  const res = await fetch(`${PROVISIONER_URL}/sites/${siteId}/build-and-deploy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PROVISIONER_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain,
      template: 'generic',
      constants,
      theme,
      pages: pagesData,
      widgetClientId: site.client_id,
      ga4Id: site.ga4_id || null,
      whiteLabel: site.white_label ?? false,
      logoUrl: site.logo_url || null,
      photos: resolvePhotos(site.photos, site.industry),
    }),
    signal: AbortSignal.timeout(240_000), // 4 min max for VPS build
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Build error');
    await supabase.from('site_deploys').insert({
      site_id: siteId,
      triggered_by: 'auto-build',
      status: 'failed',
      pages_deployed: 0,
      notes: errText.slice(0, 200),
    });
    throw new Error(`VPS build failed: ${errText.slice(0, 200)}`);
  }

  const now = new Date().toISOString();

  // Record deploy
  await supabase.from('site_deploys').insert({
    site_id: siteId,
    triggered_by: 'auto-build',
    status: 'success',
    pages_deployed: pages.length,
    deployed_at: now,
  });

  // Mark live
  await supabase
    .from('client_sites')
    .update({
      status: 'live',
      last_deployed_at: now,
      nginx_configured: true,
      ssl_active: true,
    })
    .eq('id', siteId);

  console.log(`[build-internal] Site ${siteId} is LIVE at https://${domain}`);
}
