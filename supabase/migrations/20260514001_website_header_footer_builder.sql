-- ============================================================================
-- Website Builder: Header/Footer overhaul (2026-05-14)
--
-- Adds variant selectors + custom footer columns so agencies can edit the
-- navbar and footer the way Wix/Squarespace/Webflow allow:
--   - navbar_variant: which navbar template to render
--   - footer_variant: which footer template to render
--   - footer_columns: custom column array (titles + links); overrides the
--     auto-fill from services[] / cities[] when non-empty
--
-- nav_links already exists as JSONB; we keep that schema but the shape now
-- accepts an optional `children` array on each link for dropdown menus
-- (no DB change needed, just app-layer interpretation).
--
-- All columns nullable so existing rows continue to fall back to the
-- template recipe defaults.
-- ============================================================================

ALTER TABLE client_sites
  ADD COLUMN IF NOT EXISTS navbar_variant TEXT,
  ADD COLUMN IF NOT EXISTS footer_variant TEXT,
  ADD COLUMN IF NOT EXISTS footer_columns JSONB;

COMMENT ON COLUMN client_sites.navbar_variant IS
  'Navbar template key: sticky-white | transparent-overlay | hamburger. NULL = use recipe default.';
COMMENT ON COLUMN client_sites.footer_variant IS
  'Footer template key: map-contact | four-column | minimal. NULL = use recipe default.';
COMMENT ON COLUMN client_sites.footer_columns IS
  'Custom footer columns [{ title, links: [{label, href}] }]. NULL/[] = auto-fill from services/cities.';
