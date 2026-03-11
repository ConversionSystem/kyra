-- ────────────────────────────────────────────────────────────────────────────
-- Delivery SMS Log Table
-- Tracks every SMS sent for audit, analytics, and delivery timeline
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS delivery_sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  event TEXT NOT NULL,               -- taskAssigned, taskStarted, etc.
  template_id TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT DEFAULT '',
  driver_name TEXT DEFAULT '',
  message_body TEXT NOT NULL,
  provider TEXT NOT NULL,            -- springbig, blackleaf, mock
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, failed, queued
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  webhook_received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_delivery_sms_client ON delivery_sms_log(client_id);
CREATE INDEX IF NOT EXISTS idx_delivery_sms_order ON delivery_sms_log(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_sms_sent_at ON delivery_sms_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_sms_status ON delivery_sms_log(status);

-- Row Level Security
ALTER TABLE delivery_sms_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_all" ON delivery_sms_log
  FOR ALL USING (true) WITH CHECK (true);

-- Agencies can read their own client logs
CREATE POLICY "agency_read_own" ON delivery_sms_log
  FOR SELECT USING (
    client_id IN (
      SELECT id::text FROM agency_clients
      WHERE agency_id = auth.uid()
    )
  );
