-- Website Builder P2: Visual Section Management
-- Adds section reordering and variant switching capabilities.
--
--   section_order:     JSONB array of section type strings defining render order
--                      e.g. ["hero","services","cta","about","testimonials","faq"]
--                      NULL → falls back to default recipe order (backward compatible)
--
--   section_overrides: JSONB object mapping section type → variant slug
--                      e.g. {"hero":"split-screen","cta":"form-embed"}
--                      NULL → uses industry recipe defaults (backward compatible)

-- ── client_sites columns ──────────────────────────────────────────────────────

-- Section reordering: user-defined order of sections on the page
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS section_order JSONB DEFAULT NULL;

-- Section variant overrides: user-selected variants per section type
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS section_overrides JSONB DEFAULT NULL;
