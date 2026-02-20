-- ============================================================================
-- Per-Client Gateway Isolation (OVH Architecture)
-- Migration: 20260220001_per_client_gateway.sql
--
-- ARCHITECTURAL CHANGE: Gateways move from per-agency to per-client.
-- Each agency CLIENT gets their own isolated Docker container on OVH.
-- See: projects/kyra/OVH-ARCHITECTURE-SPEC.md
-- See: projects/kyra/SECURITY-ARCHITECTURE-ANALYSIS.md
-- ============================================================================

-- Add gateway columns to agency_clients
ALTER TABLE public.agency_clients
  ADD COLUMN IF NOT EXISTS gateway_url           TEXT,
  ADD COLUMN IF NOT EXISTS gateway_token         TEXT,
  ADD COLUMN IF NOT EXISTS gateway_container_id  TEXT,
  ADD COLUMN IF NOT EXISTS gateway_status        TEXT DEFAULT NULL
    CHECK (gateway_status IS NULL OR gateway_status IN (
      'provisioning', 'starting', 'running', 'stopped', 'error'
    )),
  ADD COLUMN IF NOT EXISTS gateway_error         TEXT,
  ADD COLUMN IF NOT EXISTS gateway_provisioned_at TIMESTAMPTZ;

COMMENT ON COLUMN public.agency_clients.gateway_url IS 'HTTPS URL to client gateway (e.g. https://cl-abc123.gw.kyra.conversionsystem.com)';
COMMENT ON COLUMN public.agency_clients.gateway_token IS 'Unique auth token for this client gateway';
COMMENT ON COLUMN public.agency_clients.gateway_container_id IS 'Docker container ID on OVH (e.g. kyra-cl-abc123)';
COMMENT ON COLUMN public.agency_clients.gateway_status IS 'Container lifecycle: provisioning → starting → running → stopped → error';

-- Indexes for gateway management
CREATE INDEX IF NOT EXISTS idx_clients_gateway_status
  ON public.agency_clients(gateway_status)
  WHERE gateway_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_gateway_container
  ON public.agency_clients(gateway_container_id)
  WHERE gateway_container_id IS NOT NULL;

-- RLS: gateway columns follow existing agency_clients policies
-- (already protected by agency membership RLS)
