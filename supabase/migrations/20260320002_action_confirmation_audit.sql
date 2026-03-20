-- ============================================================================
-- GHL Action Confirmation & Audit Log
-- Tracks proposed write actions (confirm/reject) and logs all GHL API calls.
-- ============================================================================

-- ── Action Proposals (write confirmation flow) ──────────────────────────────

CREATE TABLE ghl_action_proposals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  agency_id     uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  action_type   text NOT NULL,
  action_category text NOT NULL,
  risk_level    text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  parameters    jsonb NOT NULL DEFAULT '{}',
  description   text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed', 'expired')),
  proposed_at   timestamptz NOT NULL DEFAULT now(),
  decided_at    timestamptz,
  decided_by    uuid REFERENCES auth.users(id),
  executed_at   timestamptz,
  result        jsonb,
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_ghl_action_proposals_client_id   ON ghl_action_proposals(client_id);
CREATE INDEX idx_ghl_action_proposals_status       ON ghl_action_proposals(status);
CREATE INDEX idx_ghl_action_proposals_created       ON ghl_action_proposals(proposed_at DESC);
CREATE INDEX idx_ghl_action_proposals_category     ON ghl_action_proposals(action_category);

ALTER TABLE ghl_action_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view proposals"
  ON ghl_action_proposals FOR SELECT
  USING (agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Agency members can insert proposals"
  ON ghl_action_proposals FOR INSERT
  WITH CHECK (agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Agency members can update proposals"
  ON ghl_action_proposals FOR UPDATE
  USING (agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  ));

-- ── Action Audit Log (all GHL API calls) ────────────────────────────────────

CREATE TABLE ghl_action_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  agency_id     uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  action_type   text NOT NULL,
  action_category text NOT NULL,
  is_write      boolean NOT NULL DEFAULT false,
  risk_level    text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  parameters    jsonb NOT NULL DEFAULT '{}',
  result        jsonb,
  status        text NOT NULL DEFAULT 'success',
  error_message text,
  proposal_id   uuid REFERENCES ghl_action_proposals(id) ON DELETE SET NULL,
  confirmed_by  uuid REFERENCES auth.users(id),
  duration_ms   integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ghl_action_log_client_id   ON ghl_action_log(client_id);
CREATE INDEX idx_ghl_action_log_created     ON ghl_action_log(created_at DESC);
CREATE INDEX idx_ghl_action_log_category    ON ghl_action_log(action_category);
CREATE INDEX idx_ghl_action_log_status      ON ghl_action_log(status);

ALTER TABLE ghl_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view action log"
  ON ghl_action_log FOR SELECT
  USING (agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Agency members can insert action log"
  ON ghl_action_log FOR INSERT
  WITH CHECK (agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  ));
