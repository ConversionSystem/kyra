import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { resolvePhotos } from '@/lib/sites/unsplash';
import { assemblePage } from '@/lib/sites/templates/assembler';
import { getRecipeForIndustry } from '@/lib/sites/templates/recipes';
import { getTemplateById } from '@/lib/sites/templates/gallery';
import { generateSiteHTML } from '@/lib/sites/content-engine';
import { sanitizeGeneratedHTML } from '@/lib/sites/html-sanitizer';
import { validateGeneratedHTML } from '@/lib/sites/html-quality-checker';

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

  // ---------- AI-Custom HTML mode ----------
  const isAICustom = site.template_id === 'ai-custom' || site.generation_mode === 'ai-custom';

  if (isAICustom) {
    // Generate full HTML pages via AI if not already generated
    const hasHTML = pages.some((p: Record<string, unknown>) => p.html_content);
    let htmlPages: Array<{ slug: string; html: string }>;

    if (hasHTML) {
      // Use existing HTML from database
      htmlPages = pages
        .filter((p: Record<string, unknown>) => p.html_content)
        .map((p: Record<string, unknown>) => ({ slug: p.slug as string, html: p.html_content as string }));
    } else {
      // Generate HTML for all pages
      const result = await generateSiteHTML(site.id);
      if (!result.success || !result.pages.length) {
        throw new Error(result.error || 'AI HTML generation failed');
      }
      htmlPages = result.pages;
    }

    // Sanitize and validate all pages
    const sanitizedPages = htmlPages.map((p) => {
      const sanitized = sanitizeGeneratedHTML(p.html);
      const quality = validateGeneratedHTML(sanitized);
      if (quality.issues.length > 0) {
        console.warn(`[sites/build] Page ${p.slug} quality: ${quality.score}/100`, quality.issues.join('; '));
      }
      return { slug: p.slug, html: sanitized };
    });

    // Send pre-assembled HTML to provisioner
    const res = await fetch(`${PROVISIONER_URL}/sites/${site.id}/build-and-deploy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PROVISIONER_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        template: 'ai-custom',
        htmlPages: sanitizedPages,
        widgetClientId: site.client_id,
        ga4Id: site.ga4_id || null,
        whiteLabel: site.white_label ?? false,
        logoUrl: site.logo_url || null,
      }),
      signal: AbortSignal.timeout(180_000),
    });

    const now = new Date().toISOString();

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Build failed' }));
      await supabase.from('site_deploys').insert({
        site_id: site.id,
        triggered_by: 'rebuild',
        status: 'failed',
        pages_deployed: 0,
        notes: (err as { error: string }).error || 'AI-custom build failed',
      });
      throw new Error((err as { error: string }).error || 'AI-custom build failed');
    }

    await supabase.from('site_deploys').insert({
      site_id: site.id,
      triggered_by: 'rebuild',
      status: 'success',
      pages_deployed: sanitizedPages.length,
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

    return;
  }

  // ---------- Template-based mode (existing flow) ----------
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
    url: `https://${domain}`,
    bookingUrl: site.booking_url || '',
    industry: site.industry || '',
    emergencyText: site.emergency_247 ? '24/7 Emergency Service Available' : '',
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

  // Resolve the template recipe — prefer user-selected template, fall back to industry default
  const templatePreview = site.template_id ? getTemplateById(site.template_id) : null;
  const recipe = templatePreview?.recipe || getRecipeForIndustry(site.industry || '');
  const resolvedPhotos = resolvePhotos(site.photos, site.industry);

  // Build color CSS variables from theme
  const colorVars = [
    `--color-primary: ${theme.colorPrimary};`,
    `--color-secondary: ${theme.colorSecondary};`,
    `--color-surface: #ffffff;`,
    `--color-text: #111827;`,
    `--color-text-muted: #6b7280;`,
    `--color-border: #e5e7eb;`,
    `--color-accent: ${theme.colorPrimary};`,
  ].join('\n      ');

  // Assemble full HTML for each page
  const assembledPages = pagesData.map((p: {
    slug: string; type: string; title: string;
    metaTitle: string; metaDescription: string;
    heroH1: string; heroSubtitle: string;
    sections: unknown; faq: unknown; schema: unknown;
  }) => ({
    slug: p.slug,
    type: p.type,
    html: assemblePage({
      recipe,
      colorVars,
      pageData: {
        title: p.title,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        hero_h1: p.heroH1 || p.title,
        hero_subtitle: p.heroSubtitle || '',
        content_sections: (p.sections || []) as { heading: string; body: string; bullets?: string[] }[],
        faq: (p.faq || []) as { question: string; answer: string }[],
        schema_markup: p.schema,
      },
      siteData: {
        business_name: constants.name,
        phone: constants.phone,
        phoneHref: constants.phoneHref,
        email: constants.email,
        address: constants.address,
        services,
        cities: cities.map(c => ({ name: c.name, slug: c.slug })),
        hours: site.hours || {},
        photos: resolvedPhotos,
        booking_url: constants.bookingUrl,
        widget_client_id: site.client_id,
        logoUrl: site.logo_url || undefined,
        rating: constants.rating,
        reviewCount: constants.reviewCount,
        yearsInBusiness: constants.yearsInBusiness,
        license: constants.license,
        ownerName: site.owner_name || undefined,
        ownerStory: site.owner_story || undefined,
        emergencyText: constants.emergencyText,
        tagline: constants.tagline,
      },
      pageType: p.type,
    }),
  }));

  // Call provisioner — send standard payload format (backward compatible with VPS provisioner).
  // The template assembly (assembledPages) is done server-side for future use,
  // but the provisioner still renders from constants + theme + pages using its own template.
  const res = await fetch(`${PROVISIONER_URL}/sites/${site.id}/build-and-deploy`, {
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
      photos: resolvedPhotos,
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
