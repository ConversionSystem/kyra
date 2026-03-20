// Page assembler — combines section templates into a complete HTML document

import type { SectionRecipe } from './recipes';
import type { ContentSection, FaqItem } from '../types';

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

// ---------- Helpers ----------

/** Convert markdown bold (**text**) to <strong> and strip other markdown syntax */
function mdToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

// ---------- Assembler ----------

export interface AssemblePageOptions {
  recipe: SectionRecipe;
  colorVars: string;       // CSS custom properties block (kept for backwards compat)
  colorPrimary: string;    // e.g. '#dc2626'
  colorSecondary: string;  // e.g. '#111827'
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
  };
  pageType: string;
}

export function assemblePage(options: AssemblePageOptions): string {
  const { recipe, colorVars, colorPrimary, colorSecondary, pageData, siteData, pageType } = options;
  const colors = { primary: colorPrimary, secondary: colorSecondary };

  const heroFn = HEROES[recipe.hero] || HEROES['gradient-overlay'];
  const servicesFn = SERVICES[recipe.services] || SERVICES['grid-3col'];
  const aboutFn = ABOUT[recipe.about] || ABOUT['stats-bar'];
  const testimonialsFn = TESTIMONIALS[recipe.testimonials] || TESTIMONIALS['grid-cards'];
  const ctaFn = CTAS[recipe.cta] || CTAS['form-embed'];
  const faqFn = FAQS[recipe.faq] || FAQS['accordion'];
  const footerFn = FOOTERS[recipe.footer] || FOOTERS['four-column'];
  const navbarFn = NAVBARS[recipe.navbar] || NAVBARS['sticky-white'];

  // Build section HTML
  const navbarHtml = navbarFn({
    businessName: siteData.business_name,
    logoUrl: siteData.logoUrl,
    phone: siteData.phone,
    phoneHref: siteData.phoneHref,
    bookingUrl: siteData.booking_url,
    links: [
      { label: 'Home', href: '/' },
      { label: 'Services', href: '#services' },
      { label: 'About', href: '#about' },
      { label: 'Reviews', href: '#testimonials' },
      { label: 'Contact', href: '#contact' },
    ],
    colors,
  });

  const heroHtml = heroFn({
    h1: mdToHtml(pageData.hero_h1),
    subtitle: mdToHtml(pageData.hero_subtitle),
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
      description: mdToHtml(s.description || ''),
    })),
    businessName: siteData.business_name,
    colors,
  });

  // Build about section from content_sections if available
  const aboutBody = pageData.content_sections
    ?.map(s => `<h3>${mdToHtml(s.heading)}</h3><p>${mdToHtml(s.body)}</p>`)
    .join('') || '';

  const aboutHtml = aboutFn({
    heading: `About ${siteData.business_name}`,
    body: aboutBody,
    ownerName: siteData.ownerName,
    ownerStory: siteData.ownerStory ? mdToHtml(siteData.ownerStory) : undefined,
    photoUrl: siteData.photos?.[1]?.url,
    yearsInBusiness: siteData.yearsInBusiness,
    rating: siteData.rating,
    reviewCount: siteData.reviewCount,
    license: siteData.license,
    colors,
  });

  // Placeholder testimonials (real ones come from reviews page data)
  const testimonialsHtml = testimonialsFn({
    heading: 'What Our Customers Say',
    testimonials: [
      { name: 'Happy Customer', text: 'Excellent service! Highly recommended.', rating: 5, location: 'Local' },
      { name: 'Satisfied Client', text: 'Professional, on-time, and great quality work.', rating: 5, location: 'Nearby' },
      { name: 'Loyal Customer', text: 'Been using their services for years. Never disappointed.', rating: 5, location: 'Local' },
    ],
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
        faqs: pageData.faq.map(f => ({
          question: mdToHtml(f.question),
          answer: mdToHtml(f.answer),
        })),
        colors,
      })
    : '';

  const footerHtml = footerFn({
    businessName: siteData.business_name,
    phone: siteData.phone,
    phoneHref: siteData.phoneHref,
    email: siteData.email,
    address: siteData.address,
    hours: siteData.hours,
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metaTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  ${schemaScript}
  <style>
    :root {
      ${colorVars}
    }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1f2937; }
    a { color: inherit; }
    html { scroll-behavior: smooth; }
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
