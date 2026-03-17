-- ============================================================================
-- Website Builder v2: GA4, white-label, version history
-- ============================================================================

-- Add GA4 + white-label to client_sites
ALTER TABLE client_sites
  ADD COLUMN IF NOT EXISTS ga4_id TEXT,
  ADD COLUMN IF NOT EXISTS white_label BOOLEAN DEFAULT false;

-- Version history for site deploys
CREATE TABLE IF NOT EXISTS site_deploys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES client_sites(id) ON DELETE CASCADE,
  triggered_by TEXT DEFAULT 'manual', -- 'wizard' | 'rebuild' | 'content_edit'
  status TEXT NOT NULL DEFAULT 'success', -- 'success' | 'failed'
  pages_deployed INTEGER DEFAULT 0,
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_site_deploys_site ON site_deploys(site_id);
CREATE INDEX IF NOT EXISTS idx_site_deploys_deployed_at ON site_deploys(deployed_at);
