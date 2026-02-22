-- Track when each client's GHL contacts were last scanned for new leads
-- Used by the proactive lead outreach feature in /api/ghl/poll

ALTER TABLE public.agency_clients
  ADD COLUMN IF NOT EXISTS ghl_last_contact_scan TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.agency_clients.ghl_last_contact_scan IS
  'Last time /api/ghl/poll scanned this client GHL location for new contacts to greet proactively';

-- Index for efficient querying of clients due for a scan
CREATE INDEX IF NOT EXISTS idx_agency_clients_ghl_scan
  ON public.agency_clients(ghl_last_contact_scan)
  WHERE ghl_last_contact_scan IS NOT NULL;
