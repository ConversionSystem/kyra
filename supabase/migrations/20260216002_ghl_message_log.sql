-- ============================================================================
-- GHL Message Log — Tracks all messages processed by the poller
-- This gives the dashboard visibility into AI conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS ghl_message_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_client_id uuid NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  conversation_id text NOT NULL,
  contact_id text NOT NULL,
  contact_name text,
  contact_phone text,
  contact_email text,
  inbound_message text NOT NULL,
  ai_response text NOT NULL,
  message_type text DEFAULT 'SMS',
  response_time_ms integer, -- How long the AI took to respond
  created_at timestamptz DEFAULT now()
);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_ghl_message_log_client 
  ON ghl_message_log(agency_client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ghl_message_log_contact 
  ON ghl_message_log(contact_id, created_at DESC);

-- RLS
ALTER TABLE ghl_message_log ENABLE ROW LEVEL SECURITY;

-- Agency members can see their clients' message logs
CREATE POLICY "Agency members can view message logs" ON ghl_message_log
  FOR SELECT USING (
    agency_client_id IN (
      SELECT ac.id FROM agency_clients ac
      JOIN agency_members am ON am.agency_id = ac.agency_id
      WHERE am.user_id = auth.uid()
    )
  );
