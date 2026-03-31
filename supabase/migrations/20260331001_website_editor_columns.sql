-- Website Editor Enhancement Columns
-- Adds columns needed for P0+P1 editor features:
--   nav_links, footer_tagline, social_links, email on client_sites
--   hero_cta_text, hero_cta_link on site_pages

-- ── client_sites columns ──────────────────────────────────────────────────────

-- Nav link editor: [{label, href}, ...]
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS nav_links JSONB DEFAULT NULL;

-- Footer customization
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS footer_tagline TEXT DEFAULT NULL;

-- Social media links: {"facebook":"url","instagram":"url","twitter":"url","linkedin":"url","yelp":"url"}
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT NULL;

-- Business email (separate from auto-generated info@ address)
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;

-- ── site_pages columns ────────────────────────────────────────────────────────

-- Hero CTA button customization
ALTER TABLE site_pages ADD COLUMN IF NOT EXISTS hero_cta_text TEXT DEFAULT NULL;
ALTER TABLE site_pages ADD COLUMN IF NOT EXISTS hero_cta_link TEXT DEFAULT NULL;
