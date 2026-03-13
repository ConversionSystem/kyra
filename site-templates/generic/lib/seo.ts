// ── SEO Utilities ──────────────────────────────────────────────────────────

import { BUSINESS, SERVICES, SERVICE_AREAS } from './constants';

/**
 * Generate a canonical URL for a given path.
 */
export function canonicalUrl(path: string): string {
  const base = BUSINESS.url.replace(/\/$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

/**
 * Format a phone number for tel: links.
 */
export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

/**
 * Generate breadcrumb structured data.
 */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate LocalBusiness structured data.
 */
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: BUSINESS.name,
    url: BUSINESS.url,
    telephone: BUSINESS.phoneHref,
    email: BUSINESS.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.address,
    },
    ...((BUSINESS.coordinates.lat as number) !== 0 && (BUSINESS.coordinates.lng as number) !== 0 && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: BUSINESS.coordinates.lat,
        longitude: BUSINESS.coordinates.lng,
      },
    }),
    areaServed: SERVICE_AREAS.map((area) => ({
      '@type': 'City',
      name: area.name,
    })),
    aggregateRating: BUSINESS.reviewCount > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: BUSINESS.rating,
          reviewCount: BUSINESS.reviewCount,
        }
      : undefined,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: SERVICES.map((svc) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: svc.name,
          ...(svc.description && { description: svc.description }),
        },
      })),
    },
  };
}

/**
 * Generate FAQ structured data from a list of Q&A pairs.
 */
export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Generate Service structured data.
 */
export function serviceSchema(serviceName: string, serviceDescription: string, areaName?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: serviceName,
    description: serviceDescription,
    provider: {
      '@type': 'LocalBusiness',
      name: BUSINESS.name,
      url: BUSINESS.url,
      telephone: BUSINESS.phoneHref,
    },
    ...(areaName && {
      areaServed: {
        '@type': 'City',
        name: areaName,
      },
    }),
  };
}
