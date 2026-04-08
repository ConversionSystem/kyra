// ============================================================================
// Build Helpers — shared site assembly logic used by both
//   /api/agency/sites/[id]/build         (manual rebuild)
//   /api/agency/sites/[id]/build-internal (first-time auto-build after generation)
//
// Extracted here to avoid duplication and ensure both paths use the same
// template system, design styles, real reviews, and section assembly.
// ============================================================================

import { assemblePage } from './templates/assembler';
import { assembleTrustedNetworxPage } from './templates/custom/trustednetworx';

/** Generate a decent H1 when the LLM parser fails to extract one */
function generateFallbackH1(businessName: string, industry: string, city?: string): string {
  const cityStr = city ? ` in ${city}` : '';
  const industryLabel = industry ? ` ${industry.charAt(0).toUpperCase() + industry.slice(1).replace(/-/g, ' ')}` : '';
  return `${businessName}${industryLabel ? ` —${industryLabel}` : ''} Services${cityStr}`;
}

/** Strip stray markdown from LLM-generated content before assembly */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')            // bold markers
    .replace(/\*/g, '')              // italic markers
    .replace(/^#{1,6}\s+/gm, '')     // heading markers
    .replace(/^(?:H[1-6]|Title|Headline|Subtitle)[:\s]*/i, '') // LLM label prefixes
    .trim();
}
import { getRecipeForIndustry } from './templates/recipes';
import { getTemplateById } from './templates/gallery';
import { resolvePhotos } from './unsplash';
import { checkDesignQuality } from './design-quality-checker';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

export interface AssembledSiteOutput {
  assembledPages: Array<{ slug: string; type: string; html: string }>;
  recipe: ReturnType<typeof getRecipeForIndustry>;
  constants: Record<string, unknown>;
  theme: { colorPrimary: string; colorSecondary: string; designStyle: string; bookingUrl: string | null };
  resolvedPhotos: ReturnType<typeof resolvePhotos>;
}

/**
 * Assemble all pages for a site using the current template system.
 * Handles: recipe selection, design style CSS, real reviews, color vars, HTML assembly.
 *
 * @param site    - Full site row from client_sites
 * @param pages   - All rows from site_pages for this site
 * @param supabase - Supabase client (used to fetch reviews — optional, graceful fallback)
 */
export async function assembleSitePages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  site: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pages: any[],
  supabase?: SupabaseClient,
): Promise<AssembledSiteOutput> {
  const services = (site.services || []) as Array<{ name: string; slug: string; description?: string }>;
  const cities = (site.cities || []) as Array<{ name: string; slug: string; state?: string }>;
  const address = site.address || {};

  const phone = site.phone || '';
  const phoneDigits = phone.replace(/[^0-9]/g, '');

  // Format phone for display: 1234567890 → (123) 456-7890
  const formattedPhone = phoneDigits.length === 10
    ? `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`
    : phoneDigits.length === 11 && phoneDigits.startsWith('1')
      ? `(${phoneDigits.slice(1, 4)}) ${phoneDigits.slice(4, 7)}-${phoneDigits.slice(7)}`
      : phone; // Keep original if not standard US

  const constants = {
    name: site.business_name || '',
    phone: formattedPhone,
    phoneHref: phoneDigits ? `tel:+${phoneDigits.length === 10 ? '1' : ''}${phoneDigits}` : '',
    email: `info@${site.site_domain || site.site_subdomain || 'yourdomain.com'}`,
    address: [address.street, address.city, address.state, address.zip].filter(Boolean).join(', '),
    license: site.license || '',
    rating: site.rating || 5.0,
    reviewCount: site.review_count || 0,
    yearsInBusiness: site.years_in_business || 1,
    hours: site.hours || {},
    coordinates: { lat: address.lat || 0, lng: address.lng || 0 },
    tagline: site.tagline || '',
    url: `https://${site.site_domain || site.site_subdomain || ''}`,
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

  // Resolve recipe — prefer user-selected template, fall back to industry default
  const templatePreview = site.template_id ? getTemplateById(site.template_id) : null;
  const recipe = templatePreview?.recipe || getRecipeForIndustry(site.industry || '');
  const resolvedPhotos = resolvePhotos(site.photos, site.industry);

  // Fetch real reviews if supabase client provided (graceful fallback)
  let siteReviews: Array<{ author_name: string; text: string; rating: number; time_description?: string }> = [];
  if (supabase) {
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
      // site_reviews table may not exist yet — placeholders will be used
    }
  }

  // Build :root CSS custom properties
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

  // Map DB page rows to the shape assemblePage expects
  const pagesData = pages.map((p: {
    slug: string; page_type: string; title: string;
    meta_title: string; meta_description: string;
    hero_h1: string; hero_subtitle: string;
    hero_cta_text?: string; hero_cta_link?: string;
    content_sections: unknown; faq: unknown; schema_markup: unknown;
    hidden?: boolean;
  }) => ({
    slug: p.slug,
    type: p.page_type,
    title: p.title,
    metaTitle: p.meta_title,
    metaDescription: p.meta_description,
    heroH1: p.hero_h1,
    heroSubtitle: p.hero_subtitle,
    heroCtaText: p.hero_cta_text || null,
    heroCtaLink: p.hero_cta_link || null,
    sections: p.content_sections,
    faq: p.faq,
    schema: p.schema_markup,
    hidden: p.hidden || false,
  }));

  // Filter out hidden pages (P1: section visibility)
  const visiblePages = pagesData.filter(p => !p.hidden);

  // Custom assembler for tech-enterprise (TrustedNetworx) template
  const useCustomAssembler = site.template_id === 'tech-enterprise';

  // Assemble full HTML for every visible page
  const assembledPages = visiblePages.map((p) => ({
    slug: p.slug,
    type: p.type,
    html: useCustomAssembler
      ? assembleTrustedNetworxPage(site, pages.find((pg: { slug: string }) => pg.slug === p.slug) || p, pages)
      : assemblePage({
      recipe,
      colorVars,
      designStyle: theme.designStyle,
      sectionOrder: site.section_order || null,
      sectionOverrides: site.section_overrides || null,
      pageData: {
        title: p.title,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        hero_h1: stripMarkdown(p.heroH1 || '') || generateFallbackH1(constants.name, constants.industry, address.city),
        hero_subtitle: p.heroSubtitle || '',
        hero_cta_text: p.heroCtaText || null,
        hero_cta_link: p.heroCtaLink || null,
        content_sections: (p.sections || []) as { heading: string; body: string; bullets?: string[]; cta_text?: string; cta_link?: string }[],
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
        reviews: siteReviews,
        navLinks: site.nav_links || null,
        footerTagline: site.footer_tagline || null,
        socialLinks: site.social_links || null,
        // Auto-generate Why Choose items for modern-dark sites
        whyChoose: [
          { title: `${constants.yearsInBusiness || 20}+ Years Experience`, description: `Serving the ${address.city || 'local'} area with expertise and dedication.` },
          { title: 'Licensed & Insured', description: `${constants.license ? `License ${constants.license}. ` : ''}Full coverage and liability protection.` },
          { title: 'Same-Day Service', description: 'Most repairs completed the same day. Emergency service available.' },
          { title: 'Family-Owned', description: `${site.owner_name ? `Led by ${site.owner_name} — p` : 'P'}ersonal attention on every job.` },
          { title: 'Top-Rated', description: `${constants.rating || 5.0} stars${constants.reviewCount ? ` with ${constants.reviewCount} reviews` : ''}. Trusted by the community.` },
          { title: 'All Brands & Systems', description: 'We work with all major brands and equipment types.' },
        ],
        mapEmbedUrl: site.address?.lat && site.address?.lng
          ? `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3164!2d${site.address.lng}!3d${site.address.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s!5e0!3m2!1sen!2sus`
          : undefined,
        serviceAreasHeading: `Serving All of ${address.city || 'Your'} County`,
        serviceAreasSubtitle: `From ${cities[0]?.name || address.city || 'your area'} to ${cities[cities.length - 1]?.name || 'surrounding areas'}, we provide expert services to homes and businesses.`,
      },
      pageType: p.type,
      allPages: visiblePages.map(vp => ({ slug: vp.slug, type: vp.type })),
    }),
  }));

  // Run design quality check on the homepage (most important page)
  const homepage = assembledPages.find(p => p.type === 'homepage');
  if (homepage) {
    const designQuality = checkDesignQuality(homepage.html);
    if (designQuality.issues.length > 0) {
      const criticalIssues = designQuality.issues.filter(i => i.severity === 'critical');
      const warnings = designQuality.issues.filter(i => i.severity === 'warning');
      console.log(
        `[build-helpers] Design quality: ${designQuality.score}/100 (${designQuality.grade}) | ` +
        `Slop: ${designQuality.slopScore}/100 | ` +
        `${criticalIssues.length} critical, ${warnings.length} warnings`,
      );
      if (criticalIssues.length > 0) {
        console.warn('[build-helpers] Critical design issues:', criticalIssues.map(i => i.message).join('; '));
      }
    } else {
      console.log(`[build-helpers] Design quality: ${designQuality.score}/100 (${designQuality.grade}) — ${designQuality.passedChecks.length} checks passed`);
    }
  }

  return { assembledPages, recipe, constants, theme, resolvedPhotos };
}
