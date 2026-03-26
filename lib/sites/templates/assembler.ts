// Page assembler — combines section templates into a complete HTML document

import type { SectionRecipe } from './recipes';
import type { ContentSection, FaqItem } from '../types';
import { getDesignCSS } from '../design-system';

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

export interface AssemblePageOptions {
  recipe: SectionRecipe;
  colorVars: string;       // CSS custom properties block (:root vars only)
  designStyle?: string;    // Design style key for getDesignCSS() — wires in body/card/button overrides
  pageData: {
    title: string;
    metaTitle?: string;
    metaDescription?: string;
    hero_h1: string;
    hero_subtitle: string;
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
    /** Real Google/site reviews — used instead of placeholders when available */
    reviews?: Array<{ author_name: string; text: string; rating: number; time_description?: string }>;
  };
  pageType: string;
}

export function assemblePage(options: AssemblePageOptions): string {
  const { recipe, colorVars, designStyle, pageData, siteData, pageType } = options;

  const heroFn = HEROES[recipe.hero] || HEROES['gradient-overlay'];
  const servicesFn = SERVICES[recipe.services] || SERVICES['grid-3col'];
  const aboutFn = ABOUT[recipe.about] || ABOUT['stats-bar'];
  const testimonialsFn = TESTIMONIALS[recipe.testimonials] || TESTIMONIALS['grid-cards'];
  const ctaFn = CTAS[recipe.cta] || CTAS['form-embed'];
  const faqFn = FAQS[recipe.faq] || FAQS['accordion'];
  const footerFn = FOOTERS[recipe.footer] || FOOTERS['four-column'];
  const navbarFn = NAVBARS[recipe.navbar] || NAVBARS['sticky-white'];

  // Colors object passed to every section (required after main branch section refactor)
  const colors = {
    primary: siteData.colorPrimary || '#4f46e5',
    secondary: siteData.colorSecondary || '#111827',
  };

  // Format hours for footer: Record<string,string> → human-readable lines
  const formattedHours = siteData.hours
    ? Object.entries(siteData.hours).map(([day, time]) => `${day}: ${time}`).join(' · ')
    : undefined;

  // Build section HTML
  const navbarHtml = navbarFn({
    businessName: siteData.business_name,
    logoUrl: siteData.logoUrl,
    phone: siteData.phone,
    phoneHref: siteData.phoneHref,
    bookingUrl: siteData.booking_url,
    colors,
    links: [
      { label: 'Home', href: '/' },
      { label: 'Services', href: '#services' },
      { label: 'About', href: '#about' },
      { label: 'Reviews', href: '#testimonials' },
      { label: 'Contact', href: '#contact' },
    ],
  });

  const heroHtml = heroFn({
    h1: pageData.hero_h1,
    subtitle: pageData.hero_subtitle,
    phone: siteData.phone,
    phoneHref: siteData.phoneHref,
    bookingUrl: siteData.booking_url,
    businessName: siteData.business_name,
    emergencyText: siteData.emergencyText,
    photoUrl: siteData.photos?.[0]?.url,
    logoUrl: siteData.logoUrl,
    colors,
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
  });

  // Build about section from content_sections if available
  const aboutBody = pageData.content_sections
    ?.map(s => `<h3>${s.heading}</h3><p>${s.body}</p>`)
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
  });

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
  });

  const ctaHtml = ctaFn({
    heading: 'Ready to Get Started?',
    subtitle: siteData.tagline || `Contact ${siteData.business_name} today`,
    phone: siteData.phone,
    phoneHref: siteData.phoneHref,
    bookingUrl: siteData.booking_url,
    businessName: siteData.business_name,
    emergencyText: siteData.emergencyText,
    colors,
  });

  const faqHtml = pageData.faq?.length
    ? faqFn({
        heading: 'Frequently Asked Questions',
        faqs: pageData.faq,
        colors,
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
    colors,
  });

  // Schema markup
  const schemaScript = pageData.schema_markup
    ? `<script type="application/ld+json">${JSON.stringify(pageData.schema_markup)}</script>`
    : '';

  // Kyra chat widget
  const widgetScript = siteData.widget_client_id
    ? `<script src="https://widget.kyra.conversionsystem.com/widget.js" data-client-id="${siteData.widget_client_id}" async></script>`
    : '';

  const metaTitle = pageData.metaTitle || `${pageData.title} | ${siteData.business_name}`;
  const metaDesc = pageData.metaDescription || pageData.hero_subtitle;

  // Get design-style-specific CSS overrides (body bg, card styles, button styles, typography)
  // This is what makes modern-dark look different from clean-light, bold, and minimal.
  // colorPrimary/Secondary come from the :root vars already set in colorVars.
  const colorPrimary = colorVars.match(/--color-primary:\s*([^;]+);/)?.[1]?.trim() || '#4f46e5';
  const colorSecondary = colorVars.match(/--color-secondary:\s*([^;]+);/)?.[1]?.trim() || '#111827';
  const activeDesignStyle = designStyle || 'clean-light';
  // getDesignCSS returns a full block starting with :root { ... } — we only want the rules after that
  const fullDesignCSS = getDesignCSS(activeDesignStyle, colorPrimary, colorSecondary);
  // Strip the :root block (already handled by colorVars) to avoid duplication
  const designOverrideCSS = fullDesignCSS.replace(/:root\s*\{[^}]*\}\s*/g, '').trim();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metaTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <script src="https://cdn.tailwindcss.com"></script>
  ${schemaScript}
  <style>
    :root {
      ${colorVars}
    }
    /* Design style overrides — body, section, card, button, typography */
    ${designOverrideCSS}
    a { color: inherit; }
  </style>
</head>
<body>
  ${navbarHtml}
  <main>
    ${heroHtml}
    ${pageType === 'homepage' ? servicesHtml : ''}
    ${aboutHtml}
    ${pageType === 'homepage' ? testimonialsHtml : ''}
    ${faqHtml}
    ${ctaHtml}
  </main>
  ${footerHtml}
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
