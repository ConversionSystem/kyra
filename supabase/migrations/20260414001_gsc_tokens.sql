-- ============================================================================
-- GSC OAuth Token Storage
-- Add columns to client_sites for storing Google Search Console OAuth tokens
-- and cached metrics data.
--
-- HOW TO RUN:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste this entire file and click "Run"
--   OR run via CLI: supabase db push
-- ============================================================================

ALTER TABLE client_sites
  ADD COLUMN IF NOT EXISTS gsc_access_token TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gsc_refresh_token TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gsc_token_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gsc_site_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gsc_metrics JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_gsc_sync TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ga4_id TEXT DEFAULT NULL;
