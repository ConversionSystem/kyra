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
 *
 * NOTE: Uses assembleSitePages() from lib/sites/build-helpers.ts — same template
 * system as the manual /build route. All first-time builds now get proper templates,
 * design styles, and real reviews (not the old generic single-template flow).
 */

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { assembleSitePages } from '@/lib/sites/build-helpers';

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

  // Block builds for externally-hosted sites (e.g., original HVAC site from Vercel)
  if (site.deploy_target === 'external') {
    console.log(`[build-internal] Skipping build for site ${siteId} — deploy_target is 'external'`);
    await supabase.from('client_sites').update({ status: 'live' }).eq('id', siteId);
    return;
  }

  const domain = site.site_domain || site.site_subdomain;
  if (!domain) throw new Error(`No domain for site ${siteId}`);

  // Fetch generated pages
  const { data: pages, error: pagesErr } = await supabase
    .from('site_pages')
    .select('*')
    .eq('site_id', siteId)
    .order('page_type');

  if (pagesErr || !pages?.length) throw new Error('No pages found for site');

  // Update status to deploying
  await supabase
    .from('client_sites')
    .update({ status: 'deploying', updated_at: new Date().toISOString() })
    .eq('id', siteId);

  // Assemble all pages using the shared helper — same template system as manual /build
  const { assembledPages, recipe, constants, theme, resolvedPhotos } =
    await assembleSitePages(site, pages, supabase);

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

  console.log(`[build-internal] Calling VPS for site ${siteId} (${domain}), ${pages.length} pages, template: ${site.template_id || 'industry-default'}, style: ${theme.designStyle}`);

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
      useNewTemplateSystem: true,
      constants,
      theme,
      pages: pagesData,
      assembledPages,
      recipe,
      widgetClientId: site.client_id,
      ga4Id: site.ga4_id || null,
      whiteLabel: site.white_label ?? false,
      logoUrl: site.logo_url || null,
      photos: resolvedPhotos,
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
