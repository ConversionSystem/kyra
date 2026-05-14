-- ============================================================================
-- widget_agent_messages — human-sent replies to web chat widget visitors
--
-- Phase 1+2+3 of the agent-takeover feature (2026-05-14).
--
-- Why a separate table (vs. extending client_conversations)?
--
--   client_conversations stores [user_message, ai_response] in a single row —
--   the schema assumes every interaction is a visitor↔AI exchange. Adding
--   an "agent reply" wouldn't fit that shape (no inbound message; the agent
--   is initiating). A dedicated table keeps the existing AI-conversation
--   read path untouched and gives us a clean source of truth for the
--   takeover logic + polling endpoint.
--
-- How it's used:
--
--   1. Inbox /reply endpoint inserts here when messageType = 'Web Chat'
--      (replaces the broken sendGHLMessage path for web chat).
--   2. /api/widget/chat checks for any row with this session_id in the last
--      15 minutes — if found, the AI is paused for that session and a brief
--      "team member is helping you" notice is returned instead of an LLM call.
--   3. /api/widget/[clientId]/poll returns rows since a cursor so the open
--      widget panel can render the agent's reply in real time.
-- ============================================================================

CREATE TABLE IF NOT EXISTS widget_agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  -- Who sent it. agent_user_id may be NULL for system-generated messages
  -- (e.g. automatic "human paused — resuming AI" notices).
  agent_user_id UUID,
  agent_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup pattern 1: by-session (poll endpoint, takeover-pause check)
CREATE INDEX IF NOT EXISTS idx_widget_agent_messages_session_recent
  ON widget_agent_messages (session_id, created_at DESC);

-- Lookup pattern 2: per-client cleanup / agency aggregation
CREATE INDEX IF NOT EXISTS idx_widget_agent_messages_client
  ON widget_agent_messages (client_id, created_at DESC);

COMMENT ON TABLE widget_agent_messages IS
  'Human-sent replies from the agency Inbox to web chat widget visitors. '
  'Powers the takeover-pause flag (chat route) and the poll endpoint (widget delivery).';
