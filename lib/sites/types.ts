// ============================================================================
// Website Builder Types
// Matches client_sites + site_pages tables from the database schema.
// ============================================================================

// ---------- Enums / Union Types ----------

export type SiteStatus = 'draft' | 'generating' | 'building' | 'deploying' | 'live' | 'error';

export type PageType = 'homepage' | 'service' | 'city' | 'city_service' | 'utility' | 'blog';

export type DesignStyle = 'modern-dark' | 'clean-light' | 'bold' | 'minimal';

export type AiTone = 'professional' | 'friendly' | 'casual';

export type PageSource = 'wizard' | 'growth_engine' | 'manual';

// ---------- Nested JSON Types ----------

export interface SiteAddress {
  street?: string;
  city: string;
  state: string;
  zip?: string;
  lat?: number;
  lng?: number;
}

export interface SiteService {
  name: string;
  slug: string;
  description?: string;
  price_from?: string;
}

export interface SiteCity {
  name: string;
  slug: string;
  state: string;
  distance_mi?: number;
}

export interface SiteHours {
  mon?: string;
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;
  sun?: string;
}

export interface SitePhoto {
  url: string;
  alt?: string;
  placement?: string;
}

export interface ContentSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

// ---------- Main Table Types ----------

export interface ClientSite {
  id: string;
  client_id: string | null;
  agency_id: string | null;

  // Wizard data
  business_name: string;
  industry: string;
  phone: string | null;
  address: SiteAddress | null;
  owner_name: string | null;
  owner_story: string | null;
  years_in_business: number | null;
  license: string | null;
  services: SiteService[] | null;
  cities: SiteCity[] | null;
  hours: SiteHours | null;
  rating: number | null;
  review_count: number | null;

  // Branding
  logo_url: string | null;
  photos: SitePhoto[] | null;
  color_primary: string;
  color_secondary: string;
  design_style: DesignStyle;
  tagline: string | null;

  // AI Personality
  ai_name: string | null;
  ai_tone: AiTone;
  ai_capabilities: string[] | null;
  booking_url: string | null;

  // Build state
  status: SiteStatus;
  template_id: string | null;
  deploy_target: string;
  site_domain: string | null;
  site_subdomain: string | null;
  nginx_configured: boolean;
  ssl_active: boolean;

  // Content
  page_count: number;
  content_generated_at: string | null;
  last_deployed_at: string | null;

  // Growth Engine
  search_console_connected: boolean;
  growth_suggestions: unknown | null;
  growth_last_analyzed: string | null;

  // Kyra integration
  widget_embedded: boolean;
  knowledge_synced: boolean;

  created_at: string;
  updated_at: string;
}

export interface SitePage {
  id: string;
  site_id: string;

  slug: string;
  page_type: PageType;
  title: string;
  meta_title: string | null;
  meta_description: string | null;

  // Content
  hero_h1: string | null;
  hero_subtitle: string | null;
  content_sections: ContentSection[] | null;
  faq: FaqItem[] | null;
  schema_markup: unknown | null;

  // Generation metadata
  llm_model: string | null;
  generation_cost: number | null;
  generated_at: string | null;

  // User edits
  edited: boolean;
  edited_at: string | null;

  // Growth Engine
  source: PageSource;
  search_volume: number | null;
  impressions_30d: number | null;
  clicks_30d: number | null;
}

// ---------- Wizard Data (full state across all 7 steps) ----------

export interface WizardData {
  // Step 1: Business Info
  business_name: string;
  industry: string;
  phone?: string;
  address?: SiteAddress;
  owner_name?: string;
  owner_story?: string;
  years_in_business?: number;
  license?: string;
  existing_website_url?: string;

  // Step 2: Services
  services: SiteService[];

  // Step 3: Service Area
  cities: SiteCity[];

  // Step 4: Photos & Brand
  logo_url?: string;
  photos?: SitePhoto[];
  color_primary?: string;
  color_secondary?: string;
  design_style?: DesignStyle;
  tagline?: string;

  // Step 5: AI Personality
  ai_name?: string;
  ai_tone?: AiTone;
  ai_capabilities?: string[];
  booking_url?: string;
  hours?: SiteHours;

  // Step 6: Content Generation (auto, tracked by status)
  // Step 7: Review & Launch (no persistent data beyond what's in the site)

  // Tracking
  current_step: number;
  completed_steps: number[];
}

// ---------- Content Engine Types ----------

export interface ContentTask {
  page: string;
  model: string;
  prompt: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  data?: Record<string, unknown>;
}
