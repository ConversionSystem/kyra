-- ============================================================================
-- Per-Agency OpenClaw Gateway Isolation
-- Migration: 20260218002_agency_gateway.sql
--
-- Each agency gets its own isolated OpenClaw Gateway on Fly.io.
-- No more shared terminal/sessions between agencies.
-- ============================================================================

-- Gateway provisioning columns
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS gateway_app_name    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS gateway_machine_id  TEXT,
  ADD COLUMN IF NOT EXISTS gateway_url         TEXT,
  ADD COLUMN IF NOT EXISTS gateway_token       TEXT,
  ADD COLUMN IF NOT EXISTS gateway_status      TEXT DEFAULT 'pending'
    CHECK (gateway_status IN ('pending', 'provisioning', 'starting', 'running', 'stopped', 'error', 'destroying')),
  ADD COLUMN IF NOT EXISTS gateway_region      TEXT DEFAULT 'fra',
  ADD COLUMN IF NOT EXISTS gateway_volume_id   TEXT,
  ADD COLUMN IF NOT EXISTS gateway_error       TEXT,
  ADD COLUMN IF NOT EXISTS gateway_provisioned_at TIMESTAMPTZ;

COMMENT ON COLUMN public.agencies.gateway_app_name IS 'Fly.io app name (e.g. kyra-gw-a1b2c3d4)';
COMMENT ON COLUMN public.agencies.gateway_url IS 'Full HTTPS URL to agency gateway (e.g. https://kyra-gw-a1b2c3d4.fly.dev)';
COMMENT ON COLUMN public.agencies.gateway_token IS 'Unique auth token for this agency gateway';
COMMENT ON COLUMN public.agencies.gateway_status IS 'Gateway lifecycle: pending → provisioning → starting → running';

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_agencies_gateway_status ON public.agencies(gateway_status);
CREATE INDEX IF NOT EXISTS idx_agencies_gateway_app_name ON public.agencies(gateway_app_name);
