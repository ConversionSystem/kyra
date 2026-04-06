// Page assembler — combines section templates into a complete HTML document

import type { SectionRecipe } from './recipes';
import type { ContentSection, FaqItem } from '../types';
import { getDesignCSS } from '../design-system';
import { buildPageSchemas } from '../schema-generator';
import { generateKeywords } from '../seo-helpers';
import {
  generateLocalBusinessSchemaForPage,
  generateBreadcrumbSchemaForPage,
} from '../schema-generator';

// Section imports — heroes
import { fullBleedHero } from './sections/heroes/full-bleed';
import { splitScreenHero } from './sections/heroes/split-screen';
import { centeredBadgeHero } from './sections/heroes/centered-badge';
import { gradientOverlayHero } from './sections/heroes/gradient-overlay';
import { videoHero } from './sections/heroes/video-hero';

// Section imports — services
import { grid3colServices } from './sections/services/grid-3col';
import { iconListServices } from './sections/services/icon-list';
import { alternatingServices } from './sections/services/alternating';
import { tabsServices } from './sections/services/tabs';

// Section imports — about
import { photoSplitAbout } from './sections/about/photo-split';
import { timelineAbout } from './sections/about/timeline';
import { statsBarAbout } from './sections/about/stats-bar';
import { teamGridAbout } from './sections/about/team-grid';

// Section imports — testimonials
import { carouselTestimonials } from './sections/testimonials/carousel';
import { gridCardsTestimonials } from './sections/testimonials/grid-cards';
import { singleSpotlightTestimonials } from './sections/testimonials/single-spotlight';

// Section imports — cta
import { phoneBannerCta } from './sections/cta/phone-banner';
import { formEmbedCta } from './sections/cta/form-embed';
import { splitOfferCta } from './sections/cta/split-offer';
import { floatingBarCta } from './sections/cta/floating-bar';

// Section imports — faq
import { accordionFaq } from './sections/faq/accordion';
import { twoColumnFaq } from './sections/faq/two-column';

// Section imports — footers
import { mapContactFooter } from './sections/footers/map-contact';
import { fourColumnFooter } from './sections/footers/four-column';
import { minimalFooter } from './sections/footers/minimal';

// Section imports — navbars
import { stickyWhiteNavbar } from './sections/navbars/sticky-white';
import { transparentOverlayNavbar } from './sections/navbars/transparent-overlay';
import { hamburgerNavbar } from './sections/navbars/hamburger';

// ---------- Section lookup maps ----------

const HEROES: Record<string, typeof fullBleedHero> = {
  'full-bleed': fullBleedHero,
  'split-screen': splitScreenHero,
  'centered-badge': centeredBadgeHero,
  'gradient-overlay': gradientOverlayHero,
  'video-hero': videoHero,
};

const SERVICES: Record<string, typeof grid3colServices> = {
  'grid-3col': grid3colServices,
  'icon-list': iconListServices,
  'alternating': alternatingServices,
  'tabs': tabsServices,
};

const ABOUT: Record<string, typeof photoSplitAbout> = {
  'photo-split': photoSplitAbout,
  'timeline': timelineAbout,
  'stats-bar': statsBarAbout,
  'team-grid': teamGridAbout,
};

const TESTIMONIALS: Record<string, typeof carouselTestimonials> = {
  'carousel': carouselTestimonials,
  'grid-cards': gridCardsTestimonials,
  'single-spotlight': singleSpotlightTestimonials,
};

const CTAS: Record<string, typeof phoneBannerCta> = {
  'phone-banner': phoneBannerCta,
  'form-embed': formEmbedCta,
  'split-offer': splitOfferCta,
  'floating-bar': floatingBarCta,
};

const FAQS: Record<string, typeof accordionFaq> = {
  'accordion': accordionFaq,
  'two-column': twoColumnFaq,
};

const FOOTERS: Record<string, typeof mapContactFooter> = {
  'map-contact': mapContactFooter,
  'four-column': fourColumnFooter,
  'minimal': minimalFooter,
};

const NAVBARS: Record<string, typeof stickyWhiteNavbar> = {
  'sticky-white': stickyWhiteNavbar,
  'transparent-overlay': transparentOverlayNavbar,
  'hamburger': hamburgerNavbar,
};

// ---------- Assembler ----------

// ---------- Variant Registry (exported for editor UI) ----------

export const VARIANT_REGISTRY: Record<string, { map: Record<string, unknown>; label: string }> = {
  hero:         { map: HEROES,       label: 'Hero' },
  services:     { map: SERVICES,     label: 'Services' },
  about:        { map: ABOUT,        label: 'About' },
  testimonials: { map: TESTIMONIALS, label: 'Testimonials' },
  cta:          { map: CTAS,         label: 'CTA' },
  faq:          { map: FAQS,         label: 'FAQ' },
  footer:       { map: FOOTERS,      label: 'Footer' },
  navbar:       { map: NAVBARS,      label: 'Navbar' },
};

/** Get available variant keys for a section type */
export function getVariantsForSection(sectionType: string): string[] {
  const entry = VARIANT_REGISTRY[sectionType];
  if (!entry) return [];
  return Object.keys(entry.map);
}

/** Get all section types with their variant lists (for editor UI) */
export function getAllSectionVariants(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [type, entry] of Object.entries(VARIANT_REGISTRY)) {
    result[type] = Object.keys(entry.map);
  }
  return result;
}

export interface AssemblePageOptions {
  recipe: SectionRecipe;
  colorVars: string;       // CSS custom properties block (:root vars only)
  designStyle?: string;    // Design style key for getDesignCSS() — wires in body/card/button overrides
  sectionOrder?: string[] | null;       // P2: custom section order (null → default recipe order)
  sectionOverrides?: Record<string, string> | null;  // P2: variant overrides per section type
  pageData: {
    title: string;
    metaTitle?: string;
    metaDescription?: string;
    hero_h1: string;
    hero_subtitle: string;
    hero_cta_text?: string | null;
    hero_cta_link?: string | null;
    content_sections?: ContentSection[];
    faq?: FaqItem[];
    schema_markup?: unknown;
  };
  siteData: {
    business_name: string;
    phone?: string;
    phoneHref?: string;
    email?: string;
    address?: string;
    services?: Array<{ name: string; slug: string; description?: string }>;
    cities?: Array<{ name: string; slug: string }>;
    hours?: Record<string, string>;
    photos?: Array<{ url: string; alt?: string }>;
    booking_url?: string;
    widget_client_id?: string;
    logoUrl?: string;
    rating?: number;
    reviewCount?: number;
    yearsInBusiness?: number;
    license?: string;
    ownerName?: string;
    ownerStory?: string;
    emergencyText?: string;
    tagline?: string;
    colorPrimary?: string;
    colorSecondary?: string;
    domain?: string;
    city?: string;
    state?: string;
    /** Real Google/site reviews — used instead of placeholders when available */
    reviews?: Array<{ author_name: string; text: string; rating: number; time_description?: string }>;
    /** Custom nav links from DB */
    navLinks?: Array<{ label: string; href: string }> | null;
    /** Custom footer tagline from DB */
    footerTagline?: string | null;
    /** Social media links from DB */
    socialLinks?: Record<string, string> | null;
    whyChoose?: Array<{ title: string; description: string }>;
    mapEmbedUrl?: string;
    serviceAreasHeading?: string;
    serviceAreasSubtitle?: string;
    /** Address parts for schema/geo */
    addressObj?: { street?: string; city?: string; state?: string; zip?: string; lat?: number; lng?: number } | null;
    /** Industry for keywords/schema */
    industry?: string;
    /** Review count for schema */
    reviewCount_num?: number;
  };
  pageType: string;
  /** Service slug for service pages (used in schema generation) */
  serviceSlug?: string;
  /** City name for city pages (used in schema generation) */
  cityName?: string;
  /** All pages in the site — used to build real nav links for multi-page sites */
  allPages?: Array<{ slug: string; type: string }>;
}

export function assemblePage(options: AssemblePageOptions): string {
  const { recipe, colorVars, designStyle, pageData, siteData, pageType, sectionOrder, sectionOverrides, allPages } = options;

  // P2: Merge variant overrides with recipe defaults
  const effectiveRecipe = { ...recipe };
  if (sectionOverrides) {
    for (const [sectionType, variant] of Object.entries(sectionOverrides)) {
      if (sectionType in effectiveRecipe) {
        (effectiveRecipe as Record<string, string>)[sectionType] = variant;
      }
    }
  }

  const heroFn = HEROES[effectiveRecipe.hero] || HEROES['gradient-overlay'];
  const servicesFn = SERVICES[effectiveRecipe.services] || SERVICES['grid-3col'];
  const aboutFn = ABOUT[effectiveRecipe.about] || ABOUT['stats-bar'];
  const testimonialsFn = TESTIMONIALS[effectiveRecipe.testimonials] || TESTIMONIALS['grid-cards'];
  const ctaFn = CTAS[effectiveRecipe.cta] || CTAS['form-embed'];
  const faqFn = FAQS[effectiveRecipe.faq] || FAQS['accordion'];
  const footerFn = FOOTERS[effectiveRecipe.footer] || FOOTERS['four-column'];
  const navbarFn = NAVBARS[effectiveRecipe.navbar] || NAVBARS['sticky-white'];

  // Colors object passed to every section (required after main branch section refactor)
  const colors = {
    primary: siteData.colorPrimary || '#4f46e5',
    secondary: siteData.colorSecondary || '#111827',
  };

  // Resolve design style early so section templates can branch on it
  const activeDesignStyle = designStyle || 'clean-light';

  // Format hours for footer: handles both wizard format { days, start, end }
  // and day-keyed format { Monday: "8AM-6PM", Tuesday: "8AM-6PM" }
  let formattedHours: string | undefined;
  if (siteData.hours) {
    const h = siteData.hours as Record<string, string>;
    if (h.days && h.start && h.end) {
      // Wizard format: single schedule block
      formattedHours = `${h.days}: ${h.start} - ${h.end}`;
    } else {
      // Day-keyed format: combine into readable string
      formattedHours = Object.entries(h)
        .filter(([k]) => !['days', 'start', 'end'].includes(k))
        .map(([day, time]) => `${day}: ${time}`)
        .join(' · ');
    }
  }

  // Build section HTML
  // Use custom nav links from DB, fall back to defaults
  // For multi-page sites, use real page paths; for single-page, use anchors
  const isMultiPage = allPages && allPages.length > 1;
  const defaultNavLinks = isMultiPage
    ? [
        { label: 'Home', href: '/' },
        ...(allPages.some(p => p.slug === '/about') ? [{ label: 'About', href: '/about' }] : []),
        { label: 'Services', href: '/#services' },
        { label: 'Reviews', href: '/#testimonials' },
        ...(allPages.some(p => p.type === 'blog' || p.type === 'blog_index') ? [{ label: 'Blog', href: '/blog' }] : []),
        { label: 'Contact', href: '/#contact' },
      ]
    : [
        { label: 'Home', href: '#top' },
        { label: 'Services', href: '#services' },
        { label: 'About', href: '#about' },
        { label: 'Reviews', href: '#testimonials' },
        { label: 'Contact', href: '#contact' },
      ];
  const navbarHtml = navbarFn({
    businessName: siteData.business_name,
    logoUrl: siteData.logoUrl,
    phone: siteData.phone,
    phoneHref: siteData.phoneHref,
    bookingUrl: siteData.booking_url,
    colors,
    links: (siteData.navLinks && siteData.navLinks.length > 0) ? siteData.navLinks : defaultNavLinks,
    designStyle: activeDesignStyle,
    emergencyText: siteData.emergencyText,
  });

  const heroHtml = heroFn({
    h1: pageData.hero_h1,
    subtitle: pageData.hero_subtitle,
    phone: siteData.phone,
    phoneHref: siteData.phoneHref,
    bookingUrl: siteData.booking_url,
    businessName: siteData.business_name,
    clientId: siteData.widget_client_id,
    emergencyText: siteData.emergencyText,
    photoUrl: siteData.photos?.[0]?.url,
    logoUrl: siteData.logoUrl,
    colors,
    ctaText: pageData.hero_cta_text || undefined,
    ctaLink: pageData.hero_cta_link || undefined,
    designStyle: activeDesignStyle,
  });

  const servicesHtml = servicesFn({
    heading: 'Our Services',
    services: (siteData.services || []).map(s => ({
      name: s.name,
      slug: s.slug,
      description: s.description || '',
    })),
    businessName: siteData.business_name,
    colors,
    designStyle: activeDesignStyle,
  });

  // Build about section from content_sections if available
  const aboutBody = pageData.content_sections
    ?.map(s => {
      let html = `<h3>${s.heading}</h3><p>${s.body}</p>`;
      if (s.cta_text && s.cta_link) {
        html += `<div style="margin-top: 1rem;"><a href="${s.cta_link}" style="display: inline-flex; align-items: center; gap: 6px; background: ${colors.primary}; color: white; font-weight: 700; font-size: 0.9rem; padding: 10px 24px; border-radius: 10px; text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">${s.cta_text} →</a></div>`;
      }
      return html;
    })
    .join('') || '';

  const aboutHtml = aboutFn({
    heading: `About ${siteData.business_name}`,
    body: aboutBody,
    ownerName: siteData.ownerName,
    ownerStory: siteData.ownerStory,
    photoUrl: siteData.photos?.[1]?.url,
    yearsInBusiness: siteData.yearsInBusiness,
    rating: siteData.rating,
    reviewCount: siteData.reviewCount,
    license: siteData.license,
    colors,
    designStyle: activeDesignStyle,
    // Pass-through for stats-bar "Why Choose" + "Service Areas" sections
    ...('whyChoose' in siteData ? { whyChoose: (siteData as Record<string, unknown>).whyChoose } : {}),
    ...('cities' in siteData && siteData.cities ? { cities: siteData.cities } : {}),
    ...('mapEmbedUrl' in siteData ? { mapEmbedUrl: (siteData as Record<string, unknown>).mapEmbedUrl } : {}),
    ...('serviceAreasHeading' in siteData ? { serviceAreasHeading: (siteData as Record<string, unknown>).serviceAreasHeading } : {}),
    ...('serviceAreasSubtitle' in siteData ? { serviceAreasSubtitle: (siteData as Record<string, unknown>).serviceAreasSubtitle } : {}),
  } as Parameters<typeof aboutFn>[0]);

  // Use real reviews when available; fall back to business-specific placeholders
  const reviewData = siteData.reviews?.length
    ? siteData.reviews.slice(0, 3).map(r => ({
        name: r.author_name,
        text: r.text,
        rating: r.rating,
        location: 'Verified Customer',
      }))
    : [
        { name: 'Satisfied Customer', text: `${siteData.business_name} did an excellent job. Highly recommend to anyone in the area!`, rating: 5, location: 'Local' },
        { name: 'Happy Client', text: `Professional, on-time, and great quality work. ${siteData.business_name} exceeded our expectations.`, rating: 5, location: 'Nearby' },
        { name: 'Loyal Customer', text: `We've used ${siteData.business_name} for years. Consistent, reliable, and always a pleasure to work with.`, rating: 5, location: 'Local' },
      ];

  const testimonialsHtml = testimonialsFn({
    heading: 'What Our Customers Say',
    testimonials: reviewData,
    colors,
    designStyle: activeDesignStyle,
  });

  const ctaHtml = ctaFn({
    heading: 'Ready to Get Started?',
    subtitle: siteData.tagline || `Contact ${siteData.business_name} today`,
    phone: siteData.phone,
    phoneHref: siteData.phoneHref,
    bookingUrl: siteData.booking_url,
    businessName: siteData.business_name,
    emergencyText: siteData.emergencyText,
    clientId: siteData.widget_client_id,
    colors,
    designStyle: activeDesignStyle,
  });

  const faqHtml = pageData.faq?.length
    ? faqFn({
        heading: 'Frequently Asked Questions',
        faqs: pageData.faq,
        colors,
        designStyle: activeDesignStyle,
      })
    : '';

  const footerHtml = footerFn({
    businessName: siteData.business_name,
    phone: siteData.phone,
    phoneHref: siteData.phoneHref,
    email: siteData.email,
    address: siteData.address,
    formattedHours,
    services: siteData.services,
    cities: siteData.cities,
    bookingUrl: siteData.booking_url,
    mapEmbedUrl: siteData.mapEmbedUrl,
    colors,
    footerTagline: siteData.footerTagline || undefined,
    socialLinks: siteData.socialLinks || undefined,
    designStyle: activeDesignStyle,
  });

  // Schema markup — build comprehensive schemas based on page type
  const siteForSchema = {
    business_name: siteData.business_name,
    industry: siteData.industry || '',
    phone: siteData.phone || null,
    address: siteData.addressObj || (siteData.city ? { city: siteData.city, state: siteData.state || '' } : null),
    site_domain: siteData.domain || null,
    site_subdomain: null as string | null,
    logo_url: siteData.logoUrl || null,
    rating: siteData.rating || null,
    review_count: siteData.reviewCount || null,
    hours: siteData.hours ? Object.fromEntries(
      Object.entries(siteData.hours).filter(([k]) => ['mon','tue','wed','thu','fri','sat','sun'].includes(k))
    ) as Record<string, string> : null,
    services: (siteData.services || []).map(s => ({ name: s.name, slug: s.slug, description: s.description })),
    cities: (siteData.cities || []).map(c => ({ name: c.name, slug: c.slug, state: siteData.state || '' })),
    tagline: siteData.tagline || null,
    owner_name: siteData.ownerName || null,
    social_links: siteData.socialLinks as Record<string, string> | null || null,
    google_review_url: (siteData as Record<string, unknown>).googleReviewUrl as string | null || null,
  };

  // Extract service slug from page type context
  const serviceSlug = options.serviceSlug;
  const cityName = options.cityName;

  const pageSchemas = buildPageSchemas({
    pageType,
    site: siteForSchema as unknown as Parameters<typeof buildPageSchemas>[0]['site'],
    pageTitle: pageData.title,
    pageDescription: pageData.metaDescription || pageData.hero_subtitle,
    pageSlug: pageType === 'blog' ? undefined : undefined,
    serviceSlug,
    cityName,
    faq: pageData.faq as { question: string; answer: string }[] | undefined,
    existingSchema: pageData.schema_markup || undefined,
  });

  const schemaScript = pageSchemas
    .map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n  ');

  // Kyra chat widget
  const widgetScript = siteData.widget_client_id
    ? `<script src="https://kyra.conversionsystem.com/api/widget/${siteData.widget_client_id}/script" defer></script>`
    : '';

  // Sticky mobile CTA bar
  const mobileCta = `<div id="kyra-mobile-cta" style="display:none; position:fixed; bottom:0; left:0; right:0; z-index:40; background:#ffffff; border-top:1px solid #e5e7eb; padding:10px 16px; box-shadow:0 -4px 20px rgba(0,0,0,0.1);">
  <div style="display:flex; gap:10px; max-width:600px; margin:0 auto;">
    ${siteData.phone ? `<a href="${siteData.phoneHref || `tel:${siteData.phone}`}" style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; background:${colors.primary}; color:#fff; font-weight:700; font-size:0.95rem; padding:12px 16px; border-radius:10px; text-decoration:none;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      Call Now
    </a>` : ''}
    <a href="#contact" style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; background:${colors.secondary}; color:#fff; font-weight:700; font-size:0.95rem; padding:12px 16px; border-radius:10px; text-decoration:none;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Get Quote
    </a>
  </div>
</div>
<script>(function(){var c=document.getElementById("kyra-mobile-cta");if(!c)return;function t(){c.style.display=window.innerWidth<=768?"block":"none"}t();window.addEventListener("resize",t)})();</script>`;

  const metaTitle = pageData.metaTitle || `${pageData.title} | ${siteData.business_name}`;
  const metaDesc = pageData.metaDescription || pageData.hero_subtitle;
  const siteUrl = siteData.domain ? `https://${siteData.domain}` : '';
  const heroImage = siteData.photos?.[0]?.url || '';
  const heroImageAlt = `${siteData.business_name} - ${pageData.title}`;

  // SEO: Auto-generate keywords
  const keywords = generateKeywords({
    business_name: siteData.business_name,
    industry: siteData.industry,
    city: siteData.city,
    state: siteData.state,
    services: siteData.services,
  });

  // GEO: Lat/lng for geo.position and ICBM tags
  const geoLat = siteData.addressObj?.lat;
  const geoLng = siteData.addressObj?.lng;

  // Get design-style-specific CSS overrides (body bg, card styles, button styles, typography)
  // This is what makes modern-dark look different from clean-light, bold, and minimal.
  // colorPrimary/Secondary come from the :root vars already set in colorVars.
  const colorPrimary = colorVars.match(/--color-primary:\s*([^;]+);/)?.[1]?.trim() || '#4f46e5';
  const colorSecondary = colorVars.match(/--color-secondary:\s*([^;]+);/)?.[1]?.trim() || '#111827';
  // getDesignCSS returns a full block starting with :root { ... } — we only want the rules after that
  const fullDesignCSS = getDesignCSS(activeDesignStyle, colorPrimary, colorSecondary);
  // Strip the :root block (already handled by colorVars) to avoid duplication
  const designOverrideCSS = fullDesignCSS.replace(/:root\s*\{[^}]*\}\s*/g, '').trim();

  // ── Blog article body — prose-styled content sections ─────────────────────
  let blogArticleHtml = '';
  if (pageType === 'blog' && pageData.content_sections?.length) {
    const articleSections = pageData.content_sections.map(s => {
      let html = `<h2 style="font-size:1.4rem;font-weight:700;color:#111827;margin:2rem 0 0.75rem;">${s.heading}</h2><p style="margin:0 0 1rem;">${s.body}</p>`;
      if (s.cta_text && s.cta_link) {
        html += `<p><a href="${s.cta_link}" style="color:${colors.primary};font-weight:600;text-decoration:underline;">${s.cta_text}</a></p>`;
      }
      return html;
    }).join('');
    blogArticleHtml = `<article id="article" style="max-width:780px;margin:0 auto;padding:3rem 1.5rem;font-size:1.05rem;line-height:1.85;color:#374151;">${articleSections}</article>`;
  }

  // ── Blog index — grid of post cards from content_sections ─────────────────
  let blogIndexHtml = '';
  if (pageType === 'blog_index' && pageData.content_sections?.length) {
    const cards = pageData.content_sections.map(post => `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem;">
        <h3 style="font-size:1.05rem;font-weight:700;color:#111827;margin:0;">${post.heading}</h3>
        <p style="font-size:0.9rem;color:#6b7280;flex:1;margin:0;">${post.body}</p>
        ${post.cta_link ? `<a href="${post.cta_link}" style="color:${colors.primary};font-weight:600;font-size:0.9rem;text-decoration:none;">Read More →</a>` : ''}
      </div>`).join('');
    blogIndexHtml = `<section id="blog" style="padding:3rem 1.5rem;background:#f9fafb;">
      <div style="max-width:1100px;margin:0 auto;">
        <h2 style="font-size:1.75rem;font-weight:800;text-align:center;margin:0 0 2rem;color:#111827;">Latest Articles</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem;">${cards}</div>
      </div>
    </section>`;
  }

  // P2: Build section HTML map for ordered assembly
  const sectionHtmlMap: Record<string, string> = {
    hero: heroHtml,
    services: pageType === 'homepage' ? servicesHtml : '',
    about: pageType !== 'blog' && pageType !== 'blog_index' ? aboutHtml : '',
    testimonials: pageType === 'homepage' ? testimonialsHtml : '',
    faq: faqHtml,
    cta: ctaHtml,
    blog_article: blogArticleHtml,
    blog_index: blogIndexHtml,
  };

  // Default section order (matches original hardcoded order)
  const defaultOrder = ['hero', 'services', 'about', 'testimonials', 'faq', 'cta'];

  // Use custom order if provided, fall back to default; blog pages have their own order
  const order = sectionOrder && sectionOrder.length > 0
    ? sectionOrder
    : pageType === 'blog'
      ? ['hero', 'blog_article', 'faq', 'cta']
      : pageType === 'blog_index'
        ? ['hero', 'blog_index', 'cta']
        : defaultOrder;

  // Assemble main content sections in the specified order
  const mainSectionsHtml = order
    .map(sectionType => sectionHtmlMap[sectionType] || '')
    .filter(Boolean)
    .join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metaTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <meta name="robots" content="index, follow">
  ${siteUrl ? `<link rel="canonical" href="${siteUrl}">` : ''}
  <meta property="og:title" content="${escapeHtml(metaTitle)}">
  <meta property="og:description" content="${escapeHtml(metaDesc)}">
  ${pageType === 'blog' ? `<meta property="og:type" content="article">
  <meta property="article:published_time" content="${new Date().toISOString()}">
  <meta property="article:author" content="${escapeHtml(siteData.ownerName || siteData.business_name)}">` : '<meta property="og:type" content="website">'}
  ${siteUrl ? `<meta property="og:url" content="${siteUrl}">` : ''}
  ${heroImage ? `<meta property="og:image" content="${escapeHtml(heroImage)}">
  <meta property="og:image:alt" content="${escapeHtml(heroImageAlt)}">` : ''}
  ${siteData.business_name ? `<meta property="og:site_name" content="${escapeHtml(siteData.business_name)}">` : ''}
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(metaTitle)}">
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
  ${heroImage ? `<meta name="twitter:image" content="${escapeHtml(heroImage)}">
  <meta name="twitter:image:alt" content="${escapeHtml(heroImageAlt)}">` : ''}
  ${keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}">` : ''}
  ${siteData.ownerName ? `<meta name="author" content="${escapeHtml(siteData.ownerName)}">` : ''}
  ${siteUrl ? `<link rel="alternate" hreflang="en" href="${siteUrl}">
  <link rel="alternate" hreflang="x-default" href="${siteUrl}">` : ''}
  <link rel="preconnect" href="https://cdn.tailwindcss.com">
  <link rel="dns-prefetch" href="https://cdn.tailwindcss.com">
  ${siteData.state ? `<meta name="geo.region" content="US-${escapeHtml(siteData.state)}">` : ''}
  ${siteData.city ? `<meta name="geo.placename" content="${escapeHtml(siteData.city)}">` : ''}
  ${geoLat && geoLng ? `<meta name="geo.position" content="${geoLat};${geoLng}">
  <meta name="ICBM" content="${geoLat}, ${geoLng}">` : ''}
  <script src="https://cdn.tailwindcss.com"></script>
  ${schemaScript}
  <style>
    :root {
      ${colorVars}
    }
    html { scroll-behavior: smooth; }
    [id] { scroll-margin-top: 80px; }
    /* Design style overrides — body, section, card, button, typography */
    ${designOverrideCSS}
    a { color: inherit; }
  </style>
</head>
<body id="top">
  ${navbarHtml}
  <main>
    ${mainSectionsHtml}
  </main>
  ${footerHtml}
  ${mobileCta}
  ${widgetScript}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
