import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { resolvePhotos } from '@/lib/sites/unsplash';

/** Strip stray markdown from LLM-generated content before assembly */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^(?:H[1-6]|Title|Headline|Subtitle)[:\s]*/i, '')
    .trim();
}
import { assemblePage } from '@/lib/sites/templates/assembler';
import { assembleTrustedNetworxPage } from '@/lib/sites/templates/custom/trustednetworx';
import { assembleHvacSanMateoPage } from '@/lib/sites/templates/custom/hvacsanmateo';
import { assembleAranaPaintingPage } from '@/lib/sites/templates/custom/arana-painting';
import { getRecipeForIndustry } from '@/lib/sites/templates/recipes';
import { getTemplateById } from '@/lib/sites/templates/gallery';
import { generateSiteHTML } from '@/lib/sites/content-engine';
import { sanitizeGeneratedHTML } from '@/lib/sites/html-sanitizer';
import { validateGeneratedHTML } from '@/lib/sites/html-quality-checker';
import { generateSitemapXml, generateRobotsTxt, generateLlmsTxt } from '@/lib/sites/seo-helpers';

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

  if (site.deploy_target === 'external') {
    return NextResponse.json({ error: 'This site is externally hosted and cannot be rebuilt through Kyra. Edit the site directly or change deploy_target.' }, { status: 400 });
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

    if (site.search_console_connected) {
      try {
        const { submitSitemapToGSC } = await import('@/lib/integrations/gsc');
        const result = await submitSitemapToGSC(`https://${domain}/`, `https://${domain}/sitemap.xml`);
        console.log(`[sites/build] GSC sitemap submission: ${result.success ? 'ok' : result.error}`);
      } catch (err) {
        console.error('[sites/build] GSC submission error:', err);
      }
    }

    return;
  }

  // ---------- Template-based mode (existing flow) ----------
  const address = site.address || {};
  const services = (site.services || []) as Array<{ name: string; slug: string; description?: string }>;
  const cities = (site.cities || []) as Array<{ name: string; slug: string; state?: string }>;
  const phone = site.phone || '';
  const phoneDigits = phone.replace(/[^0-9]/g, '');

  // Format phone for display: 1234567890 → (123) 456-7890
  const formattedPhone = phoneDigits.length === 10
    ? `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`
    : phoneDigits.length === 11 && phoneDigits.startsWith('1')
      ? `(${phoneDigits.slice(1, 4)}) ${phoneDigits.slice(4, 7)}-${phoneDigits.slice(7)}`
      : phone;

  // Build constants object — matches what provisioner's generateConstantsTs() expects
  const constants = {
    name: site.business_name || '',
    phone: formattedPhone,
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

  // Fetch real reviews from site_reviews if available (graceful fallback if table doesn't exist)
  let siteReviews: Array<{ author_name: string; text: string; rating: number; time_description?: string }> = [];
  try {
    const { data: reviewRows } = await supabase
      .from('site_reviews')
      .select('author_name, text, rating, time_description')
      .eq('site_id', site.id)
      .gte('rating', 4)
      .order('rating', { ascending: false })
      .limit(5);
    if (reviewRows?.length) siteReviews = reviewRows;
  } catch {
    // site_reviews table may not exist yet — use placeholders
  }

  // Build color CSS variables from theme (used in :root block)
  const isDark = theme.designStyle === 'modern-dark';
  const colorVars = [
    `--color-primary: ${theme.colorPrimary};`,
    `--color-secondary: ${theme.colorSecondary};`,
    `--color-surface: ${isDark ? '#1f2937' : '#ffffff'};`,
    `--color-text: ${isDark ? '#f9fafb' : '#111827'};`,
    `--color-text-muted: ${isDark ? '#9ca3af' : '#6b7280'};`,
    `--color-border: ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};`,
    `--color-accent: ${theme.colorPrimary};`,
  ].join('\n      ');

  // ---------- Custom assemblers ----------
  const useCustomAssembler = site.template_id === 'tech-enterprise';
  const useHvacAssembler = site.template_id === 'hvac-dark-red'
    || (site.site_domain || site.site_subdomain || '').includes('hvacsanmateo');
  const useAranaAssembler = site.template_id === 'arana-painting';

  // Assemble full HTML for each page
  const assembledPages = pagesData.map((p: {
    slug: string; type: string; title: string;
    metaTitle: string; metaDescription: string;
    heroH1: string; heroSubtitle: string;
    sections: unknown; faq: unknown; schema: unknown;
  }) => ({
    slug: p.slug,
    type: p.type,
    html: useAranaAssembler
      ? assembleAranaPaintingPage(
          {
            business_name: constants.name,
            dba: site.dba || constants.name,
            owner_company: site.owner_company || constants.name,
            phone: constants.phone,
            email: constants.email,
            address: site.address || null,
            color_primary: theme.colorPrimary,
            tagline: constants.tagline,
            logo_url: site.logo_url || null,
            services,
            cities: cities.map(c => ({ name: c.name, slug: c.slug, ...('description' in c ? { description: (c as any).description } : {}) })),
            reviews: siteReviews,
            rating: constants.rating,
            reviewCount: constants.reviewCount,
            yearsInBusiness: constants.yearsInBusiness,
            license: constants.license,
            license_types: site.license_types || '',
            ownerName: site.owner_name || '',
            year_founded: site.year_founded || '',
            hours_display: site.hours_display || '',
            widget_client_id: site.client_id || '',
            domain: domain,
            geo: site.geo || null,
            google_place_id: site.google_place_id || '',
          },
          {
            slug: p.slug,
            page_type: p.type,
            title: p.title,
            meta_title: p.metaTitle,
            meta_description: p.metaDescription,
            hero_h1: stripMarkdown(p.heroH1 || '') || null,
            hero_subtitle: p.heroSubtitle || null,
            content_sections: (p.sections || []) as { heading: string; body: string; bullets?: string[] }[],
            faq: (p.faq || []) as { question: string; answer: string }[],
            city_name: (p.type === 'city' || p.type === 'city_service') ? (cities.find(c => p.slug.includes(c.slug))?.name || '') : '',
            service_name: (p.type === 'service' || p.type === 'city_service') ? (services.find(s => p.slug.includes(s.slug))?.name || p.title) : '',
          },
          pagesData.map((pg: { slug: string; title: string }) => ({ slug: pg.slug, title: pg.title })),
        )
      : useHvacAssembler
      ? assembleHvacSanMateoPage(
          {
            business_name: constants.name,
            dba: site.dba || constants.name,
            owner_company: site.owner_company || constants.name,
            phone: constants.phone,
            email: constants.email,
            address: site.address || null,
            color_primary: theme.colorPrimary,
            tagline: constants.tagline,
            logo_url: site.logo_url || null,
            services,
            cities: cities.map(c => ({ name: c.name, slug: c.slug, ...('description' in c ? { description: (c as any).description } : {}) })),
            reviews: siteReviews,
            rating: constants.rating,
            reviewCount: constants.reviewCount,
            yearsInBusiness: constants.yearsInBusiness,
            license: constants.license,
            license_types: site.license_types || '',
            ownerName: site.owner_name || '',
            year_founded: site.year_founded || '',
            hours_display: site.hours_display || '',
            widget_client_id: site.client_id || '',
            domain: domain,
            geo: site.geo || null,
            jobs_completed: site.jobs_completed || '',
            ga4_id: site.ga4_id || null,
          },
          {
            slug: p.slug,
            page_type: p.type,
            title: p.title,
            meta_title: p.metaTitle,
            meta_description: p.metaDescription,
            hero_h1: stripMarkdown(p.heroH1 || '') || null,
            hero_subtitle: p.heroSubtitle || null,
            content_sections: (p.sections || []) as { heading: string; body: string; bullets?: string[] }[],
            faq: (p.faq || []) as { question: string; answer: string }[],
            city_name: (p.type === 'city' || p.type === 'city_service') ? (cities.find(c => p.slug.includes(c.slug))?.name || '') : '',
            service_name: (p.type === 'service' || p.type === 'city_service') ? (services.find(s => p.slug.includes(s.slug))?.name || p.title) : '',
          },
          pagesData.map((pg: { slug: string; title: string }) => ({ slug: pg.slug, title: pg.title })),
        )
      : useCustomAssembler
      ? assembleTrustedNetworxPage(
          {
            business_name: constants.name,
            phone: constants.phone,
            email: constants.email,
            address: site.address || null,
            color_primary: theme.colorPrimary,
            tagline: constants.tagline,
            logo_url: site.logo_url || null,
            nav_links: site.nav_links || null,
            services,
          },
          {
            slug: p.slug,
            page_type: p.type,
            title: p.title,
            hero_h1: stripMarkdown(p.heroH1 || '') || null,
            hero_subtitle: p.heroSubtitle || null,
            hero_cta_text: null,
            hero_cta_link: null,
            content_sections: (p.sections || []) as { heading: string; body: string; bullets?: string[] }[],
            faq: (p.faq || []) as { question: string; answer: string }[],
          },
          pagesData.map((pg: { slug: string; title: string }) => ({ slug: pg.slug, title: pg.title })),
        )
      : assemblePage({
      recipe,
      colorVars,
      designStyle: theme.designStyle,
      pageData: {
        title: p.title,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        hero_h1: stripMarkdown(p.heroH1 || '') || `${constants.name} — ${constants.industry ? constants.industry.charAt(0).toUpperCase() + constants.industry.slice(1).replace(/-/g, ' ') : ''} Services${address.city ? ' in ' + address.city : ''}`,
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
        colorPrimary: theme.colorPrimary,
        colorSecondary: theme.colorSecondary,
        domain,
        city: address.city || undefined,
        state: address.state || undefined,
        reviews: siteReviews,
        // SEO: address object for schema + geo coordinates
        addressObj: site.address || null,
        industry: constants.industry,
      },
      pageType: p.type,
      // SEO: Pass service/city context for schema generation
      serviceSlug: p.type === 'service' || p.type === 'city_service'
        ? p.slug.replace(/^\/services\//, '').replace(/^.*\//, '')
        : undefined,
      cityName: (p.type === 'city' || p.type === 'city_service') && p.slug !== '/'
        ? (cities.find(c => p.slug.includes(c.slug))?.name || p.title)
        : undefined,
    }),
  }));

  // ---------- SEO: Generate sitemap.xml, robots.txt, llms.txt ----------
  const seoPages = assembledPages.map((p: { slug: string; html: string; type: string }) => ({
    slug: p.slug,
    html: p.html,
    type: p.type,
  }));

  // Generate SEO files as additional "pages" for the provisioner
  const sitemapXml = generateSitemapXml(
    domain,
    pages.map((p: { slug: string; generated_at?: string }) => ({ slug: p.slug, updated_at: p.generated_at })),
  );
  const robotsTxt = generateRobotsTxt(domain);
  const llmsTxt = generateLlmsTxt({
    business_name: constants.name,
    domain,
    tagline: constants.tagline,
    industry: constants.industry,
    services,
    cities: cities.map(c => ({ name: c.name, slug: c.slug, state: c.state })),
    phone: constants.phone,
    email: constants.email,
    address: constants.address,
    city: address.city,
    state: address.state,
    hours: site.hours || null,
    rating: constants.rating,
    review_count: constants.reviewCount,
    years_in_business: constants.yearsInBusiness,
  });

  // Append SEO static files to assembled pages
  seoPages.push(
    { slug: '/sitemap.xml', html: sitemapXml, type: 'utility' },
    { slug: '/robots.txt', html: robotsTxt, type: 'utility' },
    { slug: '/llms.txt', html: llmsTxt, type: 'utility' },
  );

  // Call provisioner with pre-assembled HTML
  const res = await fetch(`${PROVISIONER_URL}/sites/${site.id}/build-and-deploy`, {
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
      assembledPages: seoPages,
      recipe,
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

  // Submit sitemap to GSC if connected — non-fatal
  if (site.search_console_connected) {
    try {
      const { submitSitemapToGSC } = await import('@/lib/integrations/gsc');
      const result = await submitSitemapToGSC(`https://${domain}/`, `https://${domain}/sitemap.xml`);
      console.log(`[sites/build] GSC sitemap submission: ${result.success ? 'ok' : result.error}`);
    } catch (err) {
      console.error('[sites/build] GSC submission error:', err);
    }
  }
}
