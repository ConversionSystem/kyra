-- ============================================================================
-- Agency-Level Gateway
-- Migration: 20260222001_agency_gateway.sql
--
-- Each AGENCY now gets their own dedicated OpenClaw gateway container,
-- completely separate from their clients' containers.
--
-- Architecture:
--   Agency terminal  → {agency-id}.gw.kyra.conversionsystem.com (agency's own AI)
--   Client terminal  → {client-id}.gw.kyra.conversionsystem.com (client's own AI)
--
-- These are isolated containers with separate memory, sessions, and context.
-- The agency AI knows about managing the agency business.
-- The client AI knows about the client's specific business.
-- ============================================================================

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS gateway_url             TEXT,
  ADD COLUMN IF NOT EXISTS gateway_token           TEXT,
  ADD COLUMN IF NOT EXISTS gateway_container_id    TEXT,
  ADD COLUMN IF NOT EXISTS gateway_status          TEXT DEFAULT NULL
    CHECK (gateway_status IS NULL OR gateway_status IN (
      'provisioning', 'starting', 'running', 'stopped', 'error'
    )),
  ADD COLUMN IF NOT EXISTS gateway_error           TEXT,
  ADD COLUMN IF NOT EXISTS gateway_provisioned_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.agencies.gateway_url IS 'HTTPS URL to the agency owner''s own OpenClaw gateway container';
COMMENT ON COLUMN public.agencies.gateway_token IS 'Auth token for the agency gateway';
COMMENT ON COLUMN public.agencies.gateway_container_id IS 'Docker container ID (e.g. kyra-ag-{agency-id})';
COMMENT ON COLUMN public.agencies.gateway_status IS 'Container lifecycle: provisioning → starting → running → stopped → error';

CREATE INDEX IF NOT EXISTS idx_agencies_gateway_status
  ON public.agencies(gateway_status)
  WHERE gateway_status IS NOT NULL;
