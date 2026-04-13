-- ============================================================================
-- SEO/GEO Command Center — Database Foundation
--
-- Creates 10 normalized tables for the unified SEO system:
-- 1. seo_industry_packs     — per-industry config (queries, directories, signals)
-- 2. seo_city_data           — enriched city data (Census, climate, neighborhoods)
-- 3. seo_page_metrics        — per-page GSC performance data
-- 4. seo_geo_results         — GEO test results (ChatGPT/Perplexity citations)
-- 5. seo_nap_audits          — NAP consistency audit results
-- 6. seo_competitor_scores   — competitor GEO scores
-- 7. seo_content_gaps        — queries with 0% citation → content targets
-- 8. seo_keyword_rankings    — DataForSEO keyword position tracking
-- 9. seo_published_content   — off-site content published (Web 2.0, press releases)
-- 10. seo_publish_queue      — content publish queue for cron processing
--
-- Also ALTERs client_sites and site_pages to link to new tables.
-- ============================================================================

-- 1. Industry Packs — config-driven, not hardcoded
CREATE TABLE IF NOT EXISTS seo_industry_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  services JSONB NOT NULL DEFAULT '[]',
  geo_queries JSONB NOT NULL DEFAULT '[]',
  nap_directories JSONB NOT NULL DEFAULT '[]',
  competitor_signals JSONB NOT NULL DEFAULT '{}',
  audience JSONB NOT NULL DEFAULT '{}',
  pain_points JSONB NOT NULL DEFAULT '[]',
  seasonality JSONB NOT NULL DEFAULT '{}',
  content_patterns JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. City Enrichment Data — Census + climate + neighborhoods
CREATE TABLE IF NOT EXISTS seo_city_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  population INTEGER,
  median_income INTEGER,
  median_home_age INTEGER,
  median_home_value INTEGER,
  climate_zone TEXT,
  county TEXT,
  neighborhoods JSONB NOT NULL DEFAULT '[]',
  local_landmarks JSONB NOT NULL DEFAULT '[]',
  climate_notes TEXT,
  seasonal_factors JSONB NOT NULL DEFAULT '[]',
  data_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(city, state)
);

-- 3. Per-Page GSC Metrics
CREATE TABLE IF NOT EXISTS seo_page_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES client_sites(id) ON DELETE CASCADE,
  page_slug TEXT NOT NULL,
  date DATE NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr DOUBLE PRECISION NOT NULL DEFAULT 0,
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, page_slug, date)
);

CREATE INDEX IF NOT EXISTS idx_seo_page_metrics_site_date ON seo_page_metrics(site_id, date);

-- 4. GEO Test Results (normalized from JSONB blob)
CREATE TABLE IF NOT EXISTS seo_geo_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  site_id UUID REFERENCES client_sites(id) ON DELETE SET NULL,
  tested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider TEXT NOT NULL,  -- 'chatgpt', 'perplexity', 'gemini'
  query TEXT NOT NULL,
  cited BOOLEAN NOT NULL DEFAULT false,
  citation_text TEXT,
  score_pct DOUBLE PRECISION,
  batch_id UUID  -- groups results from the same test run
);

CREATE INDEX IF NOT EXISTS idx_seo_geo_results_client ON seo_geo_results(client_id, tested_at);

-- 5. NAP Audit Results
CREATE TABLE IF NOT EXISTS seo_nap_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  site_id UUID REFERENCES client_sites(id) ON DELETE SET NULL,
  audited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  directory TEXT NOT NULL,
  nap_found JSONB NOT NULL DEFAULT '{}',  -- { name, address, phone }
  issues JSONB NOT NULL DEFAULT '[]',      -- [{ field, expected, found, status }]
  status TEXT NOT NULL DEFAULT 'pending'   -- 'match', 'mismatch', 'not_found', 'pending'
);

CREATE INDEX IF NOT EXISTS idx_seo_nap_audits_client ON seo_nap_audits(client_id, audited_at);

-- 6. Competitor Tracking
CREATE TABLE IF NOT EXISTS seo_competitor_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  site_id UUID REFERENCES client_sites(id) ON DELETE SET NULL,
  tested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  competitor_name TEXT NOT NULL,
  geo_score_pct DOUBLE PRECISION,
  source_queries JSONB NOT NULL DEFAULT '[]',
  batch_id UUID
);

CREATE INDEX IF NOT EXISTS idx_seo_competitor_client ON seo_competitor_scores(client_id, tested_at);

-- 7. Content Gaps (queries with 0% GEO citation → content targets)
CREATE TABLE IF NOT EXISTS seo_content_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  site_id UUID REFERENCES client_sites(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  gap_type TEXT NOT NULL DEFAULT 'geo',  -- 'geo', 'serp', 'content'
  priority_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_content_gaps_client ON seo_content_gaps(client_id, resolved);

-- 8. Keyword Rankings (DataForSEO → tracked over time)
CREATE TABLE IF NOT EXISTS seo_keyword_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES client_sites(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  position DOUBLE PRECISION,
  url TEXT,
  search_volume INTEGER,
  date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'dataforseo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, keyword, date)
);

CREATE INDEX IF NOT EXISTS idx_seo_keyword_rankings_site ON seo_keyword_rankings(site_id, date);

-- 9. Off-Site Published Content (Web 2.0 + press releases)
CREATE TABLE IF NOT EXISTS seo_published_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES client_sites(id) ON DELETE CASCADE,
  client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,  -- 'telegraph', 'wordpress', 'github_pages', 'notion', 'blogger', 'google_docs', 'google_sites'
  url TEXT,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'web2.0',  -- 'web2.0', 'press_release', 'semantic_stack'
  word_count INTEGER,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'published',  -- 'published', 'failed', 'removed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_published_content_site ON seo_published_content(site_id, platform);

-- 10. Publish Queue
CREATE TABLE IF NOT EXISTS seo_publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES client_sites(id) ON DELETE CASCADE,
  client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL DEFAULT 'web2.0',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_platform TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'published', 'failed'
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  published_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_publish_queue_status ON seo_publish_queue(status, scheduled_at);

-- ── ALTER existing tables ───────────────────────────────────────────────────

ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS seo_industry_pack_id UUID REFERENCES seo_industry_packs(id);

ALTER TABLE site_pages ADD COLUMN IF NOT EXISTS city_data_id UUID REFERENCES seo_city_data(id);

-- ── RLS Policies ────────────────────────────────────────────────────────────
-- Enable RLS on all new tables (service role bypasses, client access via agency)

ALTER TABLE seo_industry_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_city_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_page_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_geo_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_nap_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitor_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_published_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_publish_queue ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (API routes use service client)
-- Industry packs are read-only for all authenticated users (public config)
CREATE POLICY "industry_packs_read" ON seo_industry_packs FOR SELECT TO authenticated USING (true);
-- City data is read-only for all authenticated users (public data)
CREATE POLICY "city_data_read" ON seo_city_data FOR SELECT TO authenticated USING (true);

-- Per-site tables: access via site ownership (through agency_clients → agencies → owner)
-- These are accessed via service role in API routes, so we just need service_role bypass (default)
