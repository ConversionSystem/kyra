-- Client Conversations Log
-- Logs every AI conversation per client for agency monitoring
-- Run this in: Supabase Dashboard → SQL Editor → Run

CREATE TABLE IF NOT EXISTS client_conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  agency_id    UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL DEFAULT 'test_chat', -- test_chat | portal | telegram | sms | whatsapp
  user_message TEXT NOT NULL,
  ai_response  TEXT NOT NULL,
  tokens_used  INT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_conversations_client_id_idx ON client_conversations(client_id);
CREATE INDEX IF NOT EXISTS client_conversations_agency_id_idx ON client_conversations(agency_id);
CREATE INDEX IF NOT EXISTS client_conversations_created_at_idx ON client_conversations(created_at DESC);

-- RLS: Agency members can only see their own agency's conversations
ALTER TABLE client_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view their conversations"
  ON client_conversations FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- Service role can insert (used by API routes)
CREATE POLICY "Service role can insert conversations"
  ON client_conversations FOR INSERT
  WITH CHECK (true);
