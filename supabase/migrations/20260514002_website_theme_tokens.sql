-- ============================================================================
-- Website Builder: Theme Tokens (2026-05-14, Sprint 2)
--
-- Adds font + radius design tokens to client_sites so agencies can tune the
-- visual feel beyond just colors + a single design_style enum. Tokens are
-- applied as CSS custom properties at build time:
--   --font-sans   ← font_family   (preset id from FONT_OPTIONS)
--   --radius-base ← border_radius (preset id from RADIUS_PRESETS, or raw CSS)
--
-- NULL on either column = use the design-system default. Existing sites
-- continue to render identically until an agency opts in via the editor.
-- ============================================================================

ALTER TABLE client_sites
  ADD COLUMN IF NOT EXISTS font_family TEXT,
  ADD COLUMN IF NOT EXISTS border_radius TEXT;

COMMENT ON COLUMN client_sites.font_family IS
  'Font preset id (inter | system | serif | rounded | mono | humanist). NULL = default Inter stack.';
COMMENT ON COLUMN client_sites.border_radius IS
  'Radius preset id (sharp | subtle | default | rounded | pill) or raw CSS length. NULL = 8px default.';
