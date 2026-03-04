// ============================================================================
// Premium Templates — Add-on billing for specialized AI worker templates
//
// Premium templates are billed separately from the base Kyra plan.
// Each premium template subscription is tied to a specific client.
// ============================================================================

export type PremiumTemplateType = 'vet-seo-worker';

export interface PremiumTemplate {
  id: PremiumTemplateType;
  name: string;
  description: string;
  price: number;              // USD/month
  features: string[];
  category: string;
  icon: string;               // emoji
  setupFields: SetupField[];
  stripePriceKey: string;
}

export interface SetupField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox-group';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  helpText?: string;
}

// ── Template Definitions ──────────────────────────────────────────────────────

export const PREMIUM_TEMPLATES: Record<PremiumTemplateType, PremiumTemplate> = {
  'vet-seo-worker': {
    id: 'vet-seo-worker',
    name: 'Veterinary SEO Worker',
    description: 'Autonomous AI worker that manages off-site SEO and GEO optimization for veterinary clinics. Publishes content, monitors AI citations, audits NAP consistency, and scouts link building opportunities.',
    price: 97,
    category: 'SEO & Marketing',
    icon: '🐾',
    features: [
      'GEO visibility testing (ChatGPT + Perplexity citation tracking)',
      'NAP consistency auditing across 15+ directories',
      'Automated content creation (press releases, Web 2.0 articles, authority stacks)',
      'Multi-platform publishing (WordPress, Blogger, Telegraph, Notion, Google Docs/Sites, GitHub Pages)',
      'Reddit monitoring for vet-related discussions',
      'Outreach scouting + pitch drafting for link building',
      'Weekly SEO performance reports',
      'All LLM tokens, API costs, and infrastructure included',
    ],
    stripePriceKey: 'premium_vet_seo',
    setupFields: [
      {
        key: 'clinic_name',
        label: 'Clinic Name',
        type: 'text',
        required: true,
        placeholder: 'Goodrich Veterinary Clinic',
      },
      {
        key: 'address',
        label: 'Full Address',
        type: 'text',
        required: true,
        placeholder: '1234 Main St, Omaha, NE 68102',
      },
      {
        key: 'phone',
        label: 'Phone Number',
        type: 'text',
        required: true,
        placeholder: '(402) 555-0123',
      },
      {
        key: 'website',
        label: 'Website URL',
        type: 'text',
        required: true,
        placeholder: 'https://goodrichvet.com',
      },
      {
        key: 'gbp_url',
        label: 'Google Business Profile URL',
        type: 'text',
        required: false,
        placeholder: 'https://maps.google.com/...',
        helpText: 'The Google Maps link to your client\'s business listing',
      },
      {
        key: 'vet_name',
        label: 'Lead Veterinarian Name',
        type: 'text',
        required: true,
        placeholder: 'Dr. Sarah Johnson',
      },
      {
        key: 'city',
        label: 'City / Metro Area',
        type: 'text',
        required: true,
        placeholder: 'Omaha',
      },
      {
        key: 'services',
        label: 'Services Offered',
        type: 'checkbox-group',
        required: true,
        options: [
          { value: 'wellness', label: 'Wellness & Preventive Care' },
          { value: 'dental', label: 'Pet Dental Care' },
          { value: 'surgery', label: 'Surgery' },
          { value: 'emergency', label: 'Emergency & Critical Care' },
          { value: 'exotic', label: 'Exotic Pets' },
          { value: 'boarding', label: 'Boarding & Grooming' },
          { value: 'dermatology', label: 'Dermatology' },
          { value: 'oncology', label: 'Oncology' },
          { value: 'rehabilitation', label: 'Rehabilitation & Physical Therapy' },
          { value: 'nutrition', label: 'Nutrition & Weight Management' },
        ],
      },
      {
        key: 'target_keywords',
        label: 'Target Keywords (comma-separated)',
        type: 'textarea',
        required: false,
        placeholder: 'best vet omaha, emergency vet omaha, pet dental omaha',
        helpText: 'Leave blank to auto-generate based on city and services',
      },
      {
        key: 'content_tone',
        label: 'Content Tone',
        type: 'select',
        required: true,
        options: [
          { value: 'professional', label: 'Professional & Clinical' },
          { value: 'friendly', label: 'Warm & Friendly' },
          { value: 'community', label: 'Community-Focused' },
        ],
      },
    ],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getPremiumTemplate(id: string): PremiumTemplate | undefined {
  return PREMIUM_TEMPLATES[id as PremiumTemplateType];
}

export function getAllPremiumTemplates(): PremiumTemplate[] {
  return Object.values(PREMIUM_TEMPLATES);
}

export function isPremiumTemplate(templateId: string): boolean {
  return templateId in PREMIUM_TEMPLATES;
}
