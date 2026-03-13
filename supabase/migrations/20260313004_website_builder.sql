-- ============================================================================
-- Website Builder: client_sites + site_pages tables
-- ============================================================================

-- client_sites: stores all wizard data, build state, and deployment config
CREATE TABLE client_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES agency_clients(id),
  agency_id UUID REFERENCES agencies(id),

  -- Wizard data
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  phone TEXT,
  address JSONB,                -- { street, city, state, zip, lat, lng }
  owner_name TEXT,
  owner_story TEXT,             -- 2-3 sentences from wizard
  years_in_business INTEGER,
  license TEXT,
  services JSONB,               -- [{ name, slug, description, price_from }]
  cities JSONB,                 -- [{ name, slug, state, distance_mi }]
  hours JSONB,                  -- { mon: "8am-6pm", ... }
  rating DECIMAL(2,1),
  review_count INTEGER,

  -- Branding
  logo_url TEXT,
  photos JSONB,                 -- [{ url, alt, placement }]
  color_primary TEXT DEFAULT '#dc2626',
  color_secondary TEXT DEFAULT '#111827',
  design_style TEXT DEFAULT 'modern-dark',
  tagline TEXT,

  -- AI Personality
  ai_name TEXT,
  ai_tone TEXT DEFAULT 'professional',
  ai_capabilities JSONB,
  booking_url TEXT,

  -- Build state
  status TEXT DEFAULT 'draft',  -- draft|generating|building|deploying|live|error
  template_id TEXT,             -- 'hvac', 'dental', 'legal', etc.
  deploy_target TEXT DEFAULT 'vps', -- 'vps' or 'vercel'
  site_domain TEXT,             -- custom domain (e.g. hvacsanmateo.com)
  site_subdomain TEXT,          -- fallback: {slug}.sites.kyra.conversionsystem.com
  nginx_configured BOOLEAN DEFAULT false,
  ssl_active BOOLEAN DEFAULT false,

  -- Content
  page_count INTEGER DEFAULT 0,
  content_generated_at TIMESTAMPTZ,
  last_deployed_at TIMESTAMPTZ,

  -- Growth Engine
  search_console_connected BOOLEAN DEFAULT false,
  growth_suggestions JSONB,     -- cached suggestions from last analysis
  growth_last_analyzed TIMESTAMPTZ,

  -- Kyra integration
  widget_embedded BOOLEAN DEFAULT true,
  knowledge_synced BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_sites_client ON client_sites(client_id);
CREATE INDEX idx_client_sites_agency ON client_sites(agency_id);
CREATE INDEX idx_client_sites_status ON client_sites(status);

-- site_pages: individual pages with AI-generated content
CREATE TABLE site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES client_sites(id) ON DELETE CASCADE,

  slug TEXT NOT NULL,            -- '/services/ac-repair'
  page_type TEXT NOT NULL,       -- 'homepage'|'service'|'city'|'city_service'|'utility'|'blog'
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,

  -- Content (AI-generated, user-editable)
  hero_h1 TEXT,
  hero_subtitle TEXT,
  content_sections JSONB,       -- [{ heading, body, bullets }]
  faq JSONB,                    -- [{ question, answer }]
  schema_markup JSONB,

  -- Generation metadata
  llm_model TEXT,               -- which model generated this page
  generation_cost DECIMAL(6,4), -- track per-page cost
  generated_at TIMESTAMPTZ,

  -- User edits
  edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,

  -- Growth Engine
  source TEXT DEFAULT 'wizard', -- 'wizard'|'growth_engine'|'manual'
  search_volume INTEGER,        -- if created from Growth Engine suggestion
  impressions_30d INTEGER,      -- from Search Console
  clicks_30d INTEGER,

  UNIQUE(site_id, slug)
);

CREATE INDEX idx_site_pages_site ON site_pages(site_id);
CREATE INDEX idx_site_pages_type ON site_pages(page_type);

-- Storage bucket for site assets (logos, photos)
-- Note: Run via Supabase dashboard or SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;
