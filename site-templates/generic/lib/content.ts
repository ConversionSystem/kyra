// ── Content Helper ─────────────────────────────────────────────────────────
// Reads and types content from pages.json

import pagesData from '@/content/pages.json';

export type FAQItem = {
  question: string;
  answer: string;
};

export type Section = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type Testimonial = {
  name: string;
  text: string;
  rating: number;
};

export type PageContent = {
  slug: string;
  type: string;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  heroH1?: string;
  heroSubtitle?: string;
  sections?: Section[];
  faq?: FAQItem[];
  testimonials?: Testimonial[];
  schema?: Record<string, unknown>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pages: PageContent[] = (pagesData as any[]).map((p) => ({
  slug: p.slug || '/',
  type: p.type || 'utility',
  title: p.title || '',
  metaTitle: p.metaTitle || p.meta_title || undefined,
  metaDescription: p.metaDescription || p.meta_description || undefined,
  heroH1: p.heroH1 || p.hero_h1 || undefined,
  heroSubtitle: p.heroSubtitle || p.hero_subtitle || undefined,
  sections: Array.isArray(p.sections) ? p.sections : [],
  faq: Array.isArray(p.faq) ? p.faq : [],
  testimonials: Array.isArray(p.testimonials) ? p.testimonials : [],
  schema: p.schema || undefined,
}));

/**
 * Get page content by slug.
 * Returns undefined if no content exists for the given slug.
 */
export function getPageContent(slug: string): PageContent | undefined {
  return pages.find((p) => p.slug === slug);
}

/**
 * Get all pages of a specific type.
 */
export function getPagesByType(type: string): PageContent[] {
  return pages.filter((p) => p.type === type);
}

/**
 * Get all page content entries.
 */
export function getAllPages(): PageContent[] {
  return pages;
}
