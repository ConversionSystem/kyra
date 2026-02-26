-- Native CRM Integrations for Pipeline
-- Stores per-agency CRM connections (GHL, HubSpot, Salesforce, etc.)
-- Flexible JSONB config for provider-specific settings

-- ─────────────────────────────────────────────
-- 1. Pipeline integrations table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('ghl','hubspot','salesforce','pipedrive','custom')),
  status          TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','error')),

  -- Credentials (encrypt at rest via Supabase Vault in production)
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Provider-specific identifiers
  location_id     TEXT,           -- GHL location ID / HubSpot portal ID / Salesforce org ID
  location_name   TEXT,           -- Human-readable name

  -- Provider-specific config (calendar IDs, pipeline IDs, stage mappings, etc.)
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected keys for GHL:
  --   pipeline_id: string          — GHL pipeline to sync stages to
  --   calendar_id: string          — GHL calendar for booking
  --   stage_mapping: object        — { "found": "ghl_stage_id", "messaged": "ghl_stage_id", ... }
  --   auto_create_contacts: bool   — Auto-create GHL contacts on lead found
  --   auto_tag: bool               — Auto-tag contacts on stage changes
  --   auto_opportunity: bool       — Auto-create opportunities
  --   tag_prefix: string           — e.g. "kyra-" → tags like "kyra-hot-lead"

  -- Scopes granted
  scopes          TEXT[] NOT NULL DEFAULT '{}',

  -- Connection metadata
  connected_at    TIMESTAMPTZ,
  connected_by    UUID REFERENCES auth.users(id),
  last_synced_at  TIMESTAMPTZ,
  last_error      TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One integration per provider per agency
  UNIQUE (agency_id, provider)
);

CREATE INDEX IF NOT EXISTS pipeline_integrations_agency_idx ON pipeline_integrations(agency_id);
CREATE INDEX IF NOT EXISTS pipeline_integrations_provider_idx ON pipeline_integrations(provider, status);

ALTER TABLE pipeline_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage pipeline_integrations"
  ON pipeline_integrations FOR ALL
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS pipeline_integrations_updated_at ON pipeline_integrations;
CREATE TRIGGER pipeline_integrations_updated_at
  BEFORE UPDATE ON pipeline_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 2. CRM sync log — audit trail for all CRM operations
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_crm_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  integration_id  UUID NOT NULL REFERENCES pipeline_integrations(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES pipeline_leads(id) ON DELETE SET NULL,
  operation       TEXT NOT NULL,  -- 'create_contact', 'add_tag', 'create_opportunity', 'move_stage', 'book_appointment', 'send_message'
  provider        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','error','skipped')),
  request_data    JSONB NOT NULL DEFAULT '{}',
  response_data   JSONB NOT NULL DEFAULT '{}',
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_crm_sync_log_agency_idx ON pipeline_crm_sync_log(agency_id);
CREATE INDEX IF NOT EXISTS pipeline_crm_sync_log_lead_idx ON pipeline_crm_sync_log(lead_id);
CREATE INDEX IF NOT EXISTS pipeline_crm_sync_log_created_idx ON pipeline_crm_sync_log(created_at DESC);

ALTER TABLE pipeline_crm_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can read pipeline_crm_sync_log"
  ON pipeline_crm_sync_log FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role can insert pipeline_crm_sync_log"
  ON pipeline_crm_sync_log FOR INSERT
  WITH CHECK (true);
