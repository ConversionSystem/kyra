import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { resolvePhotos } from '@/lib/sites/unsplash';

// Build calls VPS provisioner which can take 3-5 min to compile Next.js
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ id: string }>;
}

const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'http://15.204.91.157:9090';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET || '';

/**
 * POST /api/agency/sites/[id]/build
 * Triggers a full rebuild: reads all site data + generated pages,
 * then calls the VPS provisioner /build-and-deploy (same as the wizard).
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createServiceClientWithoutCookies();

  const { data: site } = await supabase
    .from('client_sites')
    .select('*')
    .eq('id', siteId)
    .eq('agency_id', auth.data.agency.id)
    .single();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  if (!site.site_domain && !site.site_subdomain) {
    return NextResponse.json({ error: 'No domain configured for this site' }, { status: 400 });
  }

  // Mark as building immediately
  await supabase
    .from('client_sites')
    .update({ status: 'building', updated_at: new Date().toISOString() })
    .eq('id', siteId);

  // waitUntil keeps the Vercel function alive after response is sent.
  // Without this, Vercel terminates the build process immediately — site stays stuck on 'building'.
  waitUntil(
    buildAndDeploy(site, supabase).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[sites/build] Build failed for site ${siteId}:`, message);
      supabase
        .from('client_sites')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', siteId)
        .then(() => {}, () => {});
    })
  );

  return NextResponse.json({ ok: true, data: { status: 'building' } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildAndDeploy(site: any, supabase: any) {
  const domain = site.site_domain || site.site_subdomain;

  // Fetch all generated pages
  const { data: pages } = await supabase
    .from('site_pages')
    .select('*')
    .eq('site_id', site.id)
    .order('page_type');

  if (!pages?.length) {
    throw new Error('No pages generated yet. Run content generation first.');
  }

  const address = site.address || {};
  const services = (site.services || []) as Array<{ name: string; slug: string; description?: string }>;
  const cities = (site.cities || []) as Array<{ name: string; slug: string; state?: string }>;
  const phone = site.phone || '';
  const phoneDigits = phone.replace(/[^0-9]/g, '');

  // Build constants object — matches what provisioner's generateConstantsTs() expects
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
    industry: site.industry || '',
    services,
    serviceAreas: cities,
  };

  // Theme object — matches what provisioner's generateThemeTs() expects
  const theme = {
    colorPrimary: site.color_primary || '#dc2626',
    colorSecondary: site.color_secondary || '#111827',
    designStyle: site.design_style || 'modern-dark',
    bookingUrl: site.booking_url || null,
  };

  // Pages array — matches what provisioner expects
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

  // Call the correct endpoint: /build-and-deploy (full Next.js build)
  const res = await fetch(`${PROVISIONER_URL}/sites/${site.id}/build-and-deploy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PROVISIONER_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain,
      template: 'generic' // only template supported,
      constants,
      theme,
      pages: pagesData,
      widgetClientId: site.client_id,
      // Extra metadata (provisioner may use in future)
      ga4Id: site.ga4_id || null,
      whiteLabel: site.white_label ?? false,
      logoUrl: site.logo_url || null,
      photos: resolvePhotos(site.photos, site.industry),
    }),
    signal: AbortSignal.timeout(180_000), // 3 min — same as content engine
  });

  const deployStatus = res.ok ? 'success' : 'failed';

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Build failed' }));
    await supabase.from('site_deploys').insert({
      site_id: site.id,
      triggered_by: 'rebuild',
      status: 'failed',
      pages_deployed: 0,
      notes: (err as { error: string }).error || 'Build failed',
    });
    throw new Error((err as { error: string }).error || 'Build failed');
  }

  const now = new Date().toISOString();

  await supabase.from('site_deploys').insert({
    site_id: site.id,
    triggered_by: 'rebuild',
    status: deployStatus,
    pages_deployed: pages?.length ?? 0,
    deployed_at: now,
  });

  await supabase
    .from('client_sites')
    .update({
      status: 'live',
      last_deployed_at: now,
      nginx_configured: true,
      ssl_active: true,
      updated_at: now,
    })
    .eq('id', site.id);
}
