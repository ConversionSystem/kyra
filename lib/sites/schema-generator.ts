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

export function generateLocalBusinessSchema(site: ClientSite): object {
  const address = site.address;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
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
