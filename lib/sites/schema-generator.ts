// ============================================================================
// Schema Generator — Deterministic JSON-LD from business data (no LLM)
//
// Generates structured data markup for Google rich results:
// - LocalBusiness schema
// - Service schema
// - FAQ schema
// - Breadcrumb schema
// - AggregateRating schema
// ============================================================================

import type { ClientSite, SiteService, SitePage } from './types';

// ---------- LocalBusiness ----------

function getLocalBusinessType(industry: string): string {
  const lower = (industry || '').toLowerCase().replace(/[-_\s]/g, '');
  const map: Record<string, string> = {
    hvac: 'HVACBusiness', heating: 'HVACBusiness', cooling: 'HVACBusiness',
    plumbing: 'Plumber', plumber: 'Plumber',
    electrical: 'Electrician', electrician: 'Electrician',
    dental: 'Dentist', dentist: 'Dentist',
    medical: 'MedicalBusiness', doctor: 'Physician', physician: 'Physician',
    legal: 'LegalService', lawyer: 'LegalService', attorney: 'LegalService',
    roofing: 'RoofingContractor', roofer: 'RoofingContractor',
    cleaning: 'HousekeepingBusiness', maid: 'HousekeepingBusiness',
    landscaping: 'LandscapeService', lawn: 'LandscapeService',
    locksmith: 'Locksmith', painting: 'PaintContractor', flooring: 'FlooringStore',
    restaurant: 'Restaurant', cafe: 'CafeOrCoffeeShop', bakery: 'Bakery', hotel: 'Hotel',
    salon: 'HairSalon', spa: 'DaySpa', medspa: 'MedicalSpa',
    veterinary: 'VeterinaryCare', vet: 'VeterinaryCare',
    accounting: 'AccountingService', insurance: 'InsuranceAgency',
    realestate: 'RealEstateAgent', moving: 'MovingCompany', storage: 'SelfStorage',
    auto: 'AutoRepair', garage: 'AutoRepair',
    pest: 'PestControlService', solar: 'SolarEnergyCompany',
    computer: 'ComputerRepairService', it: 'ComputerRepairService',
    gym: 'ExerciseGym', fitness: 'ExerciseGym', tattoo: 'TattooParlor',
    consulting: 'ProfessionalService', financial: 'FinancialService',
  };
  for (const [key, type] of Object.entries(map)) {
    if (lower.includes(key)) return type;
  }
  return 'LocalBusiness';
}

export function generateLocalBusinessSchema(site: ClientSite): object {
  const address = site.address;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': getLocalBusinessType(site.industry),
    name: site.business_name,
    description: site.tagline || `${site.industry} services in ${address?.city || 'your area'}`,
    url: site.site_domain
      ? `https://${site.site_domain}`
      : site.site_subdomain
        ? `https://${site.site_subdomain}`
        : undefined,
    telephone: site.phone || undefined,
    image: site.logo_url || undefined,
  };

  // Task B: Additional LocalBusiness fields
  const priceMap: Record<string, string> = {
    legal: '$$$', medical: '$$$', dental: '$$', hvac: '$$', plumbing: '$$',
    electrical: '$$', roofing: '$$', cleaning: '$', landscaping: '$',
    restaurant: '$$', salon: '$$', consulting: '$$$', financial: '$$$',
  };
  const lowerInd = (site.industry || '').toLowerCase();
  schema.priceRange = Object.entries(priceMap).find(([k]) => lowerInd.includes(k))?.[1] || '$$';

  if (site.phone) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      telephone: site.phone,
      contactType: 'customer service',
      areaServed: site.address?.state || 'US',
      availableLanguage: 'English',
    };
  }

  if (site.logo_url) {
    schema.logo = { '@type': 'ImageObject', url: site.logo_url, width: 200, height: 200 };
  }

  if (site.years_in_business && site.years_in_business > 0) {
    schema.foundingDate = (new Date().getFullYear() - site.years_in_business).toString();
  }

  if (site.owner_name) {
    schema.founder = { '@type': 'Person', name: site.owner_name };
    schema.employee = [{ '@type': 'Person', name: site.owner_name, jobTitle: 'Owner', worksFor: { '@type': 'Organization', name: site.business_name } }];
  }

  const socialLinks = (site as unknown as Record<string, unknown>).social_links as Record<string, string> | null;
  const googleReviewUrl = (site as unknown as Record<string, unknown>).google_review_url as string | null;
  const sameAsUrls = [
    socialLinks?.facebook, socialLinks?.instagram, socialLinks?.yelp,
    socialLinks?.linkedin, socialLinks?.twitter, googleReviewUrl,
  ].filter(Boolean) as string[];
  if (sameAsUrls.length > 0) schema.sameAs = sameAsUrls;

  if (site.address?.lat && site.address?.lng) {
    schema.hasMap = `https://www.google.com/maps?q=${site.address.lat},${site.address.lng}`;
  }

  if (site.services?.length) schema.knowsAbout = site.services.map(s => s.name);

  schema.currenciesAccepted = 'USD';
  schema.paymentAccepted = 'Cash, Credit Card, Debit Card';

  if (address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: address.street || undefined,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.zip || undefined,
      addressCountry: 'US',
    };

    if (address.lat && address.lng) {
      schema.geo = {
        '@type': 'GeoCoordinates',
        latitude: address.lat,
        longitude: address.lng,
      };
    }
  }

  if (site.rating && site.review_count) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: site.rating,
      reviewCount: site.review_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (site.hours) {
    const dayMap: Record<string, string> = {
      mon: 'Monday',
      tue: 'Tuesday',
      wed: 'Wednesday',
      thu: 'Thursday',
      fri: 'Friday',
      sat: 'Saturday',
      sun: 'Sunday',
    };

    const openingHours: object[] = [];
    for (const [key, value] of Object.entries(site.hours)) {
      if (value && dayMap[key]) {
        // Parse "8am-6pm" style hours
        const match = value.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
        if (match) {
          openingHours.push({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: dayMap[key],
            opens: normalizeTime(match[1]),
            closes: normalizeTime(match[2]),
          });
        }
      }
    }

    if (openingHours.length > 0) {
      schema.openingHoursSpecification = openingHours;
    }
  }

  // Service area for multi-city businesses
  if (site.cities?.length) {
    schema.areaServed = site.cities.map((c) => ({
      '@type': 'City',
      name: `${c.name}, ${c.state}`,
    }));
  }

  return schema;
}

// ---------- Article ----------

export function generateArticleSchema(opts: {
  title: string; description?: string; url?: string;
  authorName?: string; publishedDate?: string; imageUrl?: string; siteName?: string;
}): object {
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: opts.title, description: opts.description || opts.title,
    url: opts.url,
    author: { '@type': 'Person', name: opts.authorName || 'Staff Writer' },
    publisher: opts.siteName ? { '@type': 'Organization', name: opts.siteName } : undefined,
    datePublished: opts.publishedDate || new Date().toISOString().split('T')[0],
    dateModified: opts.publishedDate || new Date().toISOString().split('T')[0],
    image: opts.imageUrl ? { '@type': 'ImageObject', url: opts.imageUrl } : undefined,
  };
}

// ---------- Service ----------

export function generateServiceSchema(site: ClientSite, service: SiteService): object {
  const domain = site.site_domain || site.site_subdomain;
  const baseUrl = domain ? `https://${domain}` : '';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description || `${service.name} by ${site.business_name}`,
    provider: {
      '@type': 'LocalBusiness',
      name: site.business_name,
      telephone: site.phone || undefined,
    },
    url: baseUrl ? `${baseUrl}/services/${service.slug}` : undefined,
  };

  if (site.address) {
    schema.areaServed = {
      '@type': 'City',
      name: `${site.address.city}, ${site.address.state}`,
    };
  }

  if (service.price_from) {
    schema.offers = {
      '@type': 'Offer',
      priceSpecification: {
        '@type': 'PriceSpecification',
        price: service.price_from.replace(/[^0-9.]/g, ''),
        priceCurrency: 'USD',
      },
    };
  }

  if (site.rating && site.review_count) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: site.rating,
      reviewCount: site.review_count,
    };
  }

  return schema;
}

// ---------- FAQ ----------

export function generateFAQSchema(faq: { question: string; answer: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

// ---------- Breadcrumb ----------

export function generateBreadcrumbSchema(pages: SitePage[]): object {
  // Sort: homepage first, then by slug depth
  const sorted = [...pages].sort((a, b) => {
    if (a.slug === '/') return -1;
    if (b.slug === '/') return 1;
    const depthA = a.slug.split('/').filter(Boolean).length;
    const depthB = b.slug.split('/').filter(Boolean).length;
    return depthA - depthB;
  });

  // Build breadcrumb items (top-level pages only for the main breadcrumb)
  const topLevel = sorted.filter(
    (p) => p.slug === '/' || p.slug.split('/').filter(Boolean).length <= 1,
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: topLevel.map((page, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: page.title,
      item: page.slug === '/' ? undefined : page.slug,
    })),
  };
}

// ---------- LocalBusiness (flat siteData shape — for assembler) ----------

/**
 * Generate LocalBusiness schema from the assembler's flat siteData shape.
 * Use this in the assembler; use generateLocalBusinessSchema() for ClientSite objects.
 */
export function generateLocalBusinessSchemaForPage(siteData: {
  business_name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  rating?: number;
  reviewCount?: number;
  services?: Array<{ name: string; slug: string }>;
  cities?: Array<{ name: string; slug: string }>;
  domain?: string;
  lat?: number;
  lng?: number;
  tagline?: string;
}): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteData.business_name,
    telephone: siteData.phone || undefined,
    url: siteData.domain ? `https://${siteData.domain}` : undefined,
    description: siteData.tagline || undefined,
  };

  if (siteData.city || siteData.state || siteData.address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: siteData.address || undefined,
      addressLocality: siteData.city || undefined,
      addressRegion: siteData.state || undefined,
      addressCountry: 'US',
    };
  }

  if (siteData.lat && siteData.lng) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: siteData.lat,
      longitude: siteData.lng,
    };
  }

  if (siteData.rating && siteData.reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: siteData.rating,
      reviewCount: siteData.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (siteData.cities?.length) {
    schema.areaServed = siteData.cities.map((c) => ({
      '@type': 'City',
      name: siteData.state ? `${c.name}, ${siteData.state}` : c.name,
    }));
  }

  return schema;
}

// ---------- Breadcrumb (per-page — for assembler) ----------

/**
 * Generate a BreadcrumbList schema for a specific page.
 * Use this in the assembler for page-level breadcrumbs.
 */
export function generateBreadcrumbSchemaForPage(
  domain: string,
  pageType: string,
  pageName: string,
): object {
  const baseUrl = `https://${domain}`;
  const items: Array<{ position: number; name: string; item?: string }> = [
    { position: 1, name: 'Home', item: baseUrl },
  ];

  if (pageType === 'service') {
    items.push({ position: 2, name: 'Services', item: `${baseUrl}/services` });
    items.push({ position: 3, name: pageName });
  } else if (pageType === 'city') {
    items.push({ position: 2, name: 'Service Areas', item: `${baseUrl}/service-areas` });
    items.push({ position: 3, name: pageName });
  } else if (pageType === 'city_service') {
    items.push({ position: 2, name: pageName });
  }
  // homepage: just Home (single item — still valid BreadcrumbList)

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      ...(item.item ? { item: item.item } : {}),
    })),
  };
}

// ---------- AggregateRating ----------

export function generateAggregateRatingSchema(rating: number, count: number): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    ratingValue: rating,
    reviewCount: count,
    bestRating: 5,
    worstRating: 1,
  };
}

// ---------- Combined Page Schema ----------

/**
 * Build all relevant JSON-LD schemas for a page based on its type.
 * Returns an array of schema objects to be injected as separate <script> tags.
 */
export function buildPageSchemas(opts: {
  pageType: string;
  site: ClientSite;
  pageTitle?: string;
  pageDescription?: string;
  pageSlug?: string;
  serviceSlug?: string;
  cityName?: string;
  faq?: { question: string; answer: string }[];
  existingSchema?: unknown;
}): object[] {
  const { pageType, site, pageTitle, pageDescription, pageSlug, serviceSlug, cityName, faq, existingSchema } = opts;
  const schemas: object[] = [];

  const domain = site.site_domain || site.site_subdomain;
  const baseUrl = domain ? `https://${domain}` : '';

  // Always include LocalBusiness on homepage
  if (pageType === 'homepage') {
    schemas.push(generateLocalBusinessSchema(site));
    schemas.push({
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: site.business_name, url: baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/?s={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    });
  }

  // Service pages get Service schema + LocalBusiness
  if (pageType === 'service' && serviceSlug) {
    const svc = site.services?.find(s => s.slug === serviceSlug);
    if (svc) {
      schemas.push(generateServiceSchema(site, svc));
    }
    schemas.push(generateLocalBusinessSchema(site));
  }

  // City pages get LocalBusiness with area focus
  if (pageType === 'city' || pageType === 'city_service') {
    const localBiz = generateLocalBusinessSchema(site) as Record<string, unknown>;
    if (cityName) {
      localBiz.areaServed = {
        '@type': 'City',
        name: `${cityName}${site.address?.state ? `, ${site.address.state}` : ''}`,
      };
    }
    schemas.push(localBiz);
    // City+service also gets Service schema
    if (pageType === 'city_service' && serviceSlug) {
      const svc = site.services?.find(s => s.slug === serviceSlug);
      if (svc) {
        schemas.push(generateServiceSchema(site, svc));
      }
    }
  }

  // Blog pages get Article schema
  if (pageType === 'blog') {
    schemas.push(generateArticleSchema({
      title: opts.pageTitle || 'Article',
      description: opts.pageDescription,
      url: opts.pageSlug && baseUrl ? `${baseUrl}${opts.pageSlug}` : undefined,
      authorName: site.owner_name || site.business_name,
      siteName: site.business_name,
      imageUrl: site.logo_url || undefined,
    }));
  }

  // FAQ schema when FAQ data is present
  if (faq?.length) {
    schemas.push(generateFAQSchema(faq));
  }

  // BreadcrumbList based on page type
  if (baseUrl) {
    const breadcrumbs = buildBreadcrumbForPage(pageType, baseUrl, pageTitle, cityName, serviceSlug);
    if (breadcrumbs) schemas.push(breadcrumbs);
  }

  // Preserve any existing schema (e.g. manually set)
  if (existingSchema && typeof existingSchema === 'object') {
    if (Array.isArray(existingSchema)) {
      schemas.push(...existingSchema);
    } else {
      schemas.push(existingSchema);
    }
  }

  return schemas;
}

/**
 * Build BreadcrumbList schema for a specific page type.
 */
function buildBreadcrumbForPage(
  pageType: string,
  baseUrl: string,
  pageTitle?: string,
  cityName?: string,
  serviceSlug?: string,
): object | null {
  const items: Array<{ name: string; url?: string }> = [{ name: 'Home', url: baseUrl }];

  switch (pageType) {
    case 'homepage':
      // Just Home — single item, still useful
      break;
    case 'service':
      items.push({ name: 'Services', url: `${baseUrl}/services` });
      if (pageTitle) items.push({ name: pageTitle });
      break;
    case 'city':
      items.push({ name: 'Service Areas', url: `${baseUrl}/areas` });
      if (cityName || pageTitle) items.push({ name: cityName || pageTitle || '' });
      break;
    case 'city_service':
      if (cityName) items.push({ name: cityName, url: `${baseUrl}/${cityName.toLowerCase().replace(/\s+/g, '-')}` });
      if (pageTitle) items.push({ name: pageTitle });
      break;
    default:
      if (pageTitle) items.push({ name: pageTitle });
      break;
  }

  if (items.length < 2) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

// ---------- Utility ----------

function normalizeTime(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return trimmed;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] || '00';
  const period = match[3];

  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}
