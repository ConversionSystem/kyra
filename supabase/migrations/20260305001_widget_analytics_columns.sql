-- Add session_id and source_url to client_conversations
-- Enables proper session grouping and source page analytics for chat widget
-- Run in: Supabase Dashboard → SQL Editor → Run

ALTER TABLE client_conversations
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Index for session-based grouping queries
CREATE INDEX IF NOT EXISTS idx_client_conversations_session
  ON client_conversations(session_id)
  WHERE session_id IS NOT NULL;

-- Index for source URL analytics
CREATE INDEX IF NOT EXISTS idx_client_conversations_source
  ON client_conversations(agency_id, source_url)
  WHERE source_url IS NOT NULL;

-- Also ensure web_chat channel is indexed for widget analytics performance
CREATE INDEX IF NOT EXISTS idx_client_conversations_webchat
  ON client_conversations(agency_id, channel, created_at DESC)
  WHERE channel = 'web_chat';
