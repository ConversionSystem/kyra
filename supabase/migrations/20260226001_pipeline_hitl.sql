-- Pipeline Human-in-the-Loop + Webhook Sync
-- Adds: outreach_approved stage, pipeline_webhooks table, pipeline_activity_log table

-- ─────────────────────────────────────────────
-- 1. Update stage constraint to include outreach_approved
-- ─────────────────────────────────────────────
ALTER TABLE pipeline_leads DROP CONSTRAINT IF EXISTS pipeline_leads_stage_check;
ALTER TABLE pipeline_leads ADD CONSTRAINT pipeline_leads_stage_check
  CHECK (stage IN ('found','approved','researched','outreach_approved','messaged','replied','interested','booked','closed','skipped'));

-- ─────────────────────────────────────────────
-- 2. Webhook configurations per agency
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_webhooks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  events     TEXT[] NOT NULL DEFAULT '{}',
  headers    JSONB NOT NULL DEFAULT '{}',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  secret     TEXT,
  last_status INT,
  last_error  TEXT,
  last_fired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_webhooks_agency_idx ON pipeline_webhooks(agency_id);

ALTER TABLE pipeline_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage pipeline_webhooks"
  ON pipeline_webhooks FOR ALL
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS pipeline_webhooks_updated_at ON pipeline_webhooks;
CREATE TRIGGER pipeline_webhooks_updated_at
  BEFORE UPDATE ON pipeline_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 3. Activity log for audit trail + webhook delivery tracking
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES pipeline_campaigns(id) ON DELETE SET NULL,
  lead_id     UUID REFERENCES pipeline_leads(id) ON DELETE SET NULL,
  event       TEXT NOT NULL,
  from_stage  TEXT,
  to_stage    TEXT,
  actor       TEXT NOT NULL DEFAULT 'system',
  details     JSONB NOT NULL DEFAULT '{}',
  webhook_sent BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_activity_log_agency_idx ON pipeline_activity_log(agency_id);
CREATE INDEX IF NOT EXISTS pipeline_activity_log_campaign_idx ON pipeline_activity_log(campaign_id);
CREATE INDEX IF NOT EXISTS pipeline_activity_log_created_idx ON pipeline_activity_log(created_at DESC);

ALTER TABLE pipeline_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can read pipeline_activity_log"
  ON pipeline_activity_log FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role can insert pipeline_activity_log"
  ON pipeline_activity_log FOR INSERT
  WITH CHECK (true);
