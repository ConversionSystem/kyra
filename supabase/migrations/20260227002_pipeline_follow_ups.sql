-- ============================================================================
-- Pipeline Follow-Up Sequences
-- Automated multi-touch follow-ups for leads that don't reply to outreach.
-- 80% of sales require 5+ follow-ups. This closes the biggest gap.
-- ============================================================================

-- 1. Add follow-up settings to campaigns
ALTER TABLE pipeline_campaigns
  ADD COLUMN IF NOT EXISTS follow_up_count     integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS follow_up_delay_days integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS follow_up_channel   text NOT NULL DEFAULT 'same';
  -- 'same' = use whatever channel the initial outreach used
  -- 'email', 'sms', 'both' = override

-- 2. Follow-ups table — one row per scheduled follow-up message
CREATE TABLE IF NOT EXISTS pipeline_follow_ups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  campaign_id     uuid NOT NULL REFERENCES pipeline_campaigns(id) ON DELETE CASCADE,
  lead_id         uuid NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
  follow_up_number integer NOT NULL,  -- 1, 2, 3...
  scheduled_at    timestamptz NOT NULL,
  sent_at         timestamptz,
  cancelled_at    timestamptz,
  status          text NOT NULL DEFAULT 'pending',
    -- pending: waiting to be sent
    -- sent: successfully sent
    -- cancelled: lead replied or was skipped
    -- failed: send attempt failed
    -- generating: AI is writing the message
  channel         text NOT NULL DEFAULT 'email',  -- email, sms
  subject         text,       -- for email follow-ups
  message         text,       -- the follow-up message body
  error           text,       -- error message if failed
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for cron job efficiency
CREATE INDEX IF NOT EXISTS idx_follow_ups_pending
  ON pipeline_follow_ups (status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_follow_ups_lead
  ON pipeline_follow_ups (lead_id, status);

CREATE INDEX IF NOT EXISTS idx_follow_ups_campaign
  ON pipeline_follow_ups (campaign_id);

-- RLS
ALTER TABLE pipeline_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view follow-ups"
  ON pipeline_follow_ups FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agency members can manage follow-ups"
  ON pipeline_follow_ups FOR ALL
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to follow-ups"
  ON pipeline_follow_ups FOR ALL
  USING (auth.role() = 'service_role');
