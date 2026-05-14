// ============================================================================
// Page Templates Library — Sprint 6 (2026-05-14)
//
// Pre-built page structures customers can spin up in one click instead of
// starting from blank. Each template provides:
//   - hero_h1 / hero_subtitle / hero_cta_text / hero_cta_link defaults
//   - content_sections[] pre-filled with sensible headings + placeholder copy
//   - faq[] where it makes sense (Pricing, Services)
//   - suggested meta_title / meta_description
//
// We DON'T attempt to auto-generate copy with AI here — that's the
// /api/agency/sites/:id/pages/:slug regenerate flow's job. The library is
// for "give me a good skeleton I'll fill in" which is fast + deterministic.
//
// Placeholder copy uses bracketed tokens like [Your Service] so customers
// see immediately what to replace, instead of getting lulled by smooth
// boilerplate that ships verbatim to their live site.
// ============================================================================

import type { ContentSection, FaqItem } from './types';

export interface PageTemplate {
  id: string;
  label: string;
  description: string;
  /** Lucide icon name — must exist in the dashboard's lucide-react imports. */
  icon: string;
  /** What the resulting page_type field should be (informs nav grouping). */
  pageType: 'service' | 'utility' | 'blog' | 'about' | 'contact' | 'pricing';
  hero: {
    h1: string;
    subtitle: string;
    ctaText: string;
    /** Defaults to '#contact' so the page's form-embed CTA receives clicks. */
    ctaLink?: string;
  };
  metaTitle: string;
  metaDescription: string;
  contentSections: ContentSection[];
  faq?: FaqItem[];
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'about',
    label: 'About',
    description: 'Founder story, mission, team, milestones.',
    icon: 'FileText',
    pageType: 'about',
    hero: {
      h1: 'About [Your Business]',
      subtitle: 'A short line on who you are and who you serve.',
      ctaText: 'Get in touch',
    },
    metaTitle: 'About [Your Business] — Our Story',
    metaDescription: 'Learn about [Your Business], our team, our mission, and what drives us to serve customers in [City].',
    contentSections: [
      {
        heading: 'Our Story',
        body: 'Tell the founding story — when you started, why, and what you set out to fix. 2-3 sentences. Customers want to know the human behind the brand before they trust you with their money.',
        bullets: [],
      },
      {
        heading: 'What We Stand For',
        body: 'Three concrete values customers can verify, not buzzwords.',
        bullets: [
          'Honest pricing — no surprise add-ons',
          'Show up on time, every time',
          'Stand behind our work with a real guarantee',
        ],
      },
      {
        heading: 'Meet The Team',
        body: 'A line on the founder + the depth of the team. Photos render via the Media Library (use placement="team").',
        bullets: [],
      },
    ],
    faq: [
      { question: 'How long have you been in business?', answer: '[X] years serving [City] and surrounding areas.' },
      { question: 'Are you licensed and insured?', answer: 'Yes — license #[XXX], fully insured and bonded.' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    description: 'Tier comparison, what\'s included, FAQ.',
    icon: 'Star',
    pageType: 'pricing',
    hero: {
      h1: 'Pricing',
      subtitle: 'Straightforward pricing. No hidden fees. Pick the option that fits.',
      ctaText: 'Request a quote',
    },
    metaTitle: '[Your Business] — Pricing',
    metaDescription: 'Transparent pricing for [Your Service]. Compare options and request a free quote for your project in [City].',
    contentSections: [
      {
        heading: 'Starter',
        body: '$[Price] — for [scope of work]. Great for first-time customers and small projects.',
        bullets: [
          '[Specific deliverable A]',
          '[Specific deliverable B]',
          'Email support',
        ],
        cta_text: 'Get a quote',
        cta_link: '#contact',
      },
      {
        heading: 'Standard (Most Popular)',
        body: '$[Price] — for [scope of work]. The plan most of our customers pick.',
        bullets: [
          'Everything in Starter',
          '[Specific deliverable C]',
          'Priority phone support',
          '[Specific deliverable D]',
        ],
        cta_text: 'Get a quote',
        cta_link: '#contact',
      },
      {
        heading: 'Premium',
        body: '$[Price] — for [scope of work]. White-glove service for high-stakes projects.',
        bullets: [
          'Everything in Standard',
          'Dedicated project manager',
          'Same-day response, 24/7',
          '[Specific deliverable E]',
        ],
        cta_text: 'Get a quote',
        cta_link: '#contact',
      },
    ],
    faq: [
      { question: 'Are there any hidden fees?', answer: 'No. The price you see is the price you pay. We never add charges without explicit approval.' },
      { question: 'Do you offer payment plans?', answer: 'Yes — we can break larger projects into milestone payments. Ask during your free consultation.' },
      { question: 'What if I need something not listed?', answer: 'Custom scope is normal. Send us details via the contact form and we\'ll quote it within 24 hours.' },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Service catalog with descriptions + CTAs.',
    icon: 'Briefcase',
    pageType: 'service',
    hero: {
      h1: 'Our Services',
      subtitle: 'What we do, who we serve, and how to get started.',
      ctaText: 'Request a quote',
    },
    metaTitle: '[Your Business] Services — [City]',
    metaDescription: 'Explore the full range of [Your Service] offerings from [Your Business], serving [City] and surrounding areas.',
    contentSections: [
      {
        heading: '[Service One]',
        body: 'Describe the service in plain language. Who it\'s for, what it covers, what the customer will experience.',
        bullets: [
          'Concrete inclusion or benefit',
          'Typical timeline',
          'Starting price or "free estimate"',
        ],
        cta_text: 'Get a quote',
        cta_link: '#contact',
      },
      {
        heading: '[Service Two]',
        body: 'Same shape — clear, specific, customer-language.',
        bullets: [
          'Inclusion',
          'Timeline',
          'Pricing cue',
        ],
        cta_text: 'Get a quote',
        cta_link: '#contact',
      },
      {
        heading: '[Service Three]',
        body: 'Same shape.',
        bullets: [],
        cta_text: 'Get a quote',
        cta_link: '#contact',
      },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    description: 'Hours, location, multiple contact methods.',
    icon: 'Phone',
    pageType: 'contact',
    hero: {
      h1: 'Contact Us',
      subtitle: 'Reach out — we typically respond within an hour during business hours.',
      ctaText: 'Send a message',
      ctaLink: '#contact',
    },
    metaTitle: 'Contact [Your Business] — [City]',
    metaDescription: 'Call, email, or send a message. We respond within one hour during business hours.',
    contentSections: [
      {
        heading: 'Get In Touch',
        body: 'Multiple ways to reach us — pick what works for you. Phone for urgent needs, email for detailed questions, and the form below for everything else.',
        bullets: [
          'Phone: [your phone]',
          'Email: [your email]',
          'Address: [your address]',
        ],
      },
      {
        heading: 'Hours',
        body: 'When we\'re available to take calls and accept visits. Outside these hours, the form below still works — we\'ll respond first thing the next business day.',
        bullets: [
          'Monday–Friday: 8 AM – 6 PM',
          'Saturday: 9 AM – 2 PM',
          'Sunday: Closed (form responses queued)',
        ],
      },
    ],
  },
  {
    id: 'landing',
    label: 'Landing Page',
    description: 'Single-offer focus, social proof, one CTA.',
    icon: 'Sparkles',
    pageType: 'utility',
    hero: {
      h1: '[Your Headline Offer]',
      subtitle: 'A one-line promise that explains exactly what the visitor gets.',
      ctaText: 'Claim this offer',
    },
    metaTitle: '[Your Headline Offer] — [Your Business]',
    metaDescription: '[Short version of the offer + who it\'s for]. Limited spots available.',
    contentSections: [
      {
        heading: 'What You Get',
        body: 'Three concrete deliverables. No vague language.',
        bullets: [
          '[Deliverable A]',
          '[Deliverable B]',
          '[Deliverable C]',
        ],
      },
      {
        heading: 'Why People Choose Us',
        body: 'Three reasons backed by specifics, not adjectives. Numbers, named customers, or a guarantee — whatever\'s true.',
        bullets: [
          '[X+] customers served in [City]',
          '[X.X] star average rating across [N] reviews',
          'Money-back guarantee if not satisfied',
        ],
      },
      {
        heading: 'How It Works',
        body: 'Three steps from interest to delivery. Set expectations.',
        bullets: [
          'Step 1 — [action]',
          'Step 2 — [action]',
          'Step 3 — [action]',
        ],
        cta_text: 'Get started',
        cta_link: '#contact',
      },
    ],
    faq: [
      { question: 'How quickly will I hear back?', answer: 'Within 1 business hour during operating hours.' },
      { question: 'Is the consultation really free?', answer: 'Yes. No commitment, no payment info required.' },
    ],
  },
];

export function getPageTemplate(id: string): PageTemplate | null {
  return PAGE_TEMPLATES.find((t) => t.id === id) || null;
}
