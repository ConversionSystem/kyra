// Template gallery — 8 preset template combinations for the wizard UI

import type { SectionRecipe } from './recipes';

export interface TemplatePreview {
  id: string;
  name: string;
  description: string;
  industries: string[];
  recipe: SectionRecipe;
  previewColors: { primary: string; secondary: string };
}

export const TEMPLATE_GALLERY: TemplatePreview[] = [
  {
    id: 'professional-dark',
    name: 'Professional Dark',
    description: 'Authority-forward dark layout with bold typography and strong CTAs',
    industries: ['hvac', 'electrical', 'auto', 'roofing', 'pest-control', 'locksmith', 'remodeling'],
    recipe: {
      hero: 'full-bleed',
      services: 'grid-3col',
      about: 'stats-bar',
      testimonials: 'grid-cards',
      cta: 'phone-banner',
      faq: 'accordion',
      footer: 'four-column',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#dc2626', secondary: '#111827' },
  },
  {
    id: 'clean-clinical',
    name: 'Clean Clinical',
    description: 'White, clinical, trust-focused design for healthcare and professional services',
    industries: ['dental', 'medical', 'veterinary', 'accounting'],
    recipe: {
      hero: 'centered-badge',
      services: 'icon-list',
      about: 'team-grid',
      testimonials: 'single-spotlight',
      cta: 'form-embed',
      faq: 'two-column',
      footer: 'map-contact',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#0d9488', secondary: '#f0fdfa' },
  },
  {
    id: 'bold-emergency',
    name: 'Bold Emergency',
    description: 'Big phone CTA, emergency-first design for 24/7 service businesses',
    industries: ['plumbing', 'locksmith', 'hvac', 'electrical', 'pest-control'],
    recipe: {
      hero: 'full-bleed',
      services: 'icon-list',
      about: 'stats-bar',
      testimonials: 'carousel',
      cta: 'phone-banner',
      faq: 'accordion',
      footer: 'four-column',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#ef4444', secondary: '#18181b' },
  },
  {
    id: 'elegant-minimal',
    name: 'Elegant Minimal',
    description: 'Soft colors, lots of whitespace, understated elegance',
    industries: ['med-spa', 'salon', 'consulting', 'accounting'],
    recipe: {
      hero: 'gradient-overlay',
      services: 'alternating',
      about: 'photo-split',
      testimonials: 'single-spotlight',
      cta: 'split-offer',
      faq: 'two-column',
      footer: 'minimal',
      navbar: 'transparent-overlay',
    },
    previewColors: { primary: '#ec4899', secondary: '#fdf2f8' },
  },
  {
    id: 'photo-forward',
    name: 'Photo Forward',
    description: 'Large images, visual-first layout for portfolio-driven businesses',
    industries: ['landscaping', 'painting', 'flooring', 'remodeling', 'salon', 'restaurant'],
    recipe: {
      hero: 'split-screen',
      services: 'alternating',
      about: 'photo-split',
      testimonials: 'grid-cards',
      cta: 'split-offer',
      faq: 'accordion',
      footer: 'four-column',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#d97706', secondary: '#1c1917' },
  },
  {
    id: 'local-trust',
    name: 'Local Trust',
    description: 'Map, reviews, and local emphasis for neighborhood service providers',
    industries: ['cleaning', 'lawn-care', 'moving', 'plumbing', 'painting'],
    recipe: {
      hero: 'split-screen',
      services: 'grid-3col',
      about: 'stats-bar',
      testimonials: 'carousel',
      cta: 'phone-banner',
      faq: 'accordion',
      footer: 'map-contact',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#2563eb', secondary: '#eff6ff' },
  },
  {
    id: 'modern-gradient',
    name: 'Modern Gradient',
    description: 'Gradient hero, modern feel with contemporary design elements',
    industries: ['fitness', 'real-estate', 'consulting', 'med-spa'],
    recipe: {
      hero: 'gradient-overlay',
      services: 'grid-3col',
      about: 'timeline',
      testimonials: 'carousel',
      cta: 'form-embed',
      faq: 'accordion',
      footer: 'four-column',
      navbar: 'hamburger',
    },
    previewColors: { primary: '#7c3aed', secondary: '#1e1b4b' },
  },
  {
    id: 'conversion-focused',
    name: 'Conversion Focused',
    description: 'Form-heavy, multiple CTAs, optimized for lead generation',
    industries: ['legal', 'real-estate', 'dental', 'medical', 'consulting'],
    recipe: {
      hero: 'centered-badge',
      services: 'grid-3col',
      about: 'stats-bar',
      testimonials: 'grid-cards',
      cta: 'split-offer',
      faq: 'accordion',
      footer: 'four-column',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#4f46e5', secondary: '#eef2ff' },
  },
];

/** Get templates sorted by relevance to a given industry */
export function getTemplatesForIndustry(industry: string): TemplatePreview[] {
  const matches = TEMPLATE_GALLERY.filter(t => t.industries.includes(industry));
  const others = TEMPLATE_GALLERY.filter(t => !t.industries.includes(industry));
  return [...matches, ...others];
}

/** Get a single template by ID */
export function getTemplateById(id: string): TemplatePreview | undefined {
  return TEMPLATE_GALLERY.find(t => t.id === id);
}
