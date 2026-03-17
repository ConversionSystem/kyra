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

/**
 * Strip markdown artifacts (**bold**, *italic*, # headings, leading colons) from AI-generated text.
 */
export function cleanText(s: string): string {
  return s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/gm, '').replace(/^:\s*/, '').trim();
}

/**
 * Map raw industry slugs to proper display labels for titles/meta.
 */
const INDUSTRY_LABELS: Record<string, string> = {
  hvac: 'HVAC Services',
  plumbing: 'Plumbing Services',
  dental: 'Dental Practice',
  legal: 'Law Firm',
  restaurant: 'Restaurant',
  'real-estate': 'Real Estate',
  auto: 'Auto Services',
  'med-spa': 'Medical Spa',
  fitness: 'Fitness & Gym',
  veterinary: 'Veterinary Clinic',
  cannabis: 'Cannabis Dispensary',
  consulting: 'Consulting Firm',
  electrical: 'Electrical Services',
  roofing: 'Roofing Services',
  landscaping: 'Landscaping Services',
};

/**
 * Get a proper industry label from a raw industry slug.
 * Falls back to title-cased slug if not in the map.
 */
export function getIndustryLabel(industry: string): string {
  return INDUSTRY_LABELS[industry.toLowerCase()] ||
    industry.charAt(0).toUpperCase() + industry.slice(1).replace(/-/g, ' ');
}
