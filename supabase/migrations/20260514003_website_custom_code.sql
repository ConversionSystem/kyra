-- ============================================================================
-- Website Builder: Custom Code Injection (2026-05-14, Sprint 3)
--
-- Two text columns on client_sites hold raw HTML/JS that the assembler
-- injects into every page at build time:
--   - head_code → before </head>  (analytics, pixels, custom CSS, meta tags)
--   - body_code → before </body>  (chat widgets, tracking scripts)
--
-- We do NOT sanitize these strings — they're agency-supplied custom code and
-- their site, their content. Customers paste analytics snippets and we honor
-- them verbatim. Both columns are nullable; NULL means "inject nothing".
--
-- Storage: TEXT (no length cap) because some analytics blobs (e.g. Plausible
-- + GTM + ad pixels combined) can approach several KB. Postgres TEXT has no
-- inline performance penalty up to ~8KB which covers any realistic snippet.
-- ============================================================================

ALTER TABLE client_sites
  ADD COLUMN IF NOT EXISTS head_code TEXT,
  ADD COLUMN IF NOT EXISTS body_code TEXT;

COMMENT ON COLUMN client_sites.head_code IS
  'Raw HTML injected before </head> on every page (analytics, pixels, custom CSS).';
COMMENT ON COLUMN client_sites.body_code IS
  'Raw HTML injected before </body> on every page (chat widgets, tracking scripts).';
