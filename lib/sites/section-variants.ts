// ============================================================================
// Section Variant Registry — shared constants for editor UI and assembler
// Client-safe: no server imports, just data.
// ============================================================================

export interface SectionVariantInfo {
  label: string;        // Human-readable section name (e.g. "Hero")
  icon: string;         // Lucide icon name
  variants: string[];   // Available variant slugs
}

/** All section types and their available variants */
export const SECTION_VARIANTS: Record<string, SectionVariantInfo> = {
  hero: {
    label: 'Hero',
    icon: 'Sparkles',
    variants: ['full-bleed', 'split-screen', 'centered-badge', 'gradient-overlay', 'video-hero'],
  },
  services: {
    label: 'Services',
    icon: 'Briefcase',
    variants: ['grid-3col', 'icon-list', 'alternating', 'tabs'],
  },
  about: {
    label: 'About',
    icon: 'FileText',
    variants: ['photo-split', 'timeline', 'stats-bar', 'team-grid'],
  },
  testimonials: {
    label: 'Testimonials',
    icon: 'Star',
    variants: ['carousel', 'grid-cards', 'single-spotlight'],
  },
  cta: {
    label: 'CTA',
    icon: 'MousePointerClick',
    variants: ['phone-banner', 'form-embed', 'split-offer', 'floating-bar'],
  },
  faq: {
    label: 'FAQ',
    icon: 'HelpCircle',
    variants: ['accordion', 'two-column'],
  },
  footer: {
    label: 'Footer',
    icon: 'FileText',
    variants: ['map-contact', 'four-column', 'minimal'],
  },
  navbar: {
    label: 'Navbar',
    icon: 'Navigation',
    variants: ['sticky-white', 'transparent-overlay', 'hamburger'],
  },
};

/** Section types that can be reordered (excludes navbar/footer which are structural) */
export const REORDERABLE_SECTIONS = ['hero', 'services', 'about', 'testimonials', 'cta', 'faq'] as const;

/** Default section order (matches assembler's hardcoded order) */
export const DEFAULT_SECTION_ORDER = ['hero', 'services', 'about', 'testimonials', 'faq', 'cta'] as const;

/** Convert variant slug to human-readable label */
export function formatVariantName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
