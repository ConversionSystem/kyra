-- Worker Performance Tracking — Phase 2: Modular Worker System
-- Tracks per-worker, per-client performance metrics monthly.

CREATE TABLE IF NOT EXISTS worker_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,
  worker_id TEXT NOT NULL,          -- role ID from role-workers.ts

  -- Performance metrics (updated incrementally)
  total_conversations INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,

  -- Quality signals
  conversations_with_reply INTEGER DEFAULT 0,     -- customer replied after AI
  conversations_ghosted INTEGER DEFAULT 0,        -- customer never replied
  escalations INTEGER DEFAULT 0,                  -- handed off to human
  bookings_made INTEGER DEFAULT 0,                -- appointments booked
  positive_signals INTEGER DEFAULT 0,             -- "thanks", "great", positive sentiment
  negative_signals INTEGER DEFAULT 0,             -- complaints, "wrong", negative sentiment

  -- Cost tracking
  total_tokens_used BIGINT DEFAULT 0,
  total_credits_used INTEGER DEFAULT 0,

  -- Time range
  period_start DATE NOT NULL,       -- monthly tracking
  period_end DATE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(client_id, worker_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_worker_perf_client ON worker_performance(client_id, worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_perf_agency ON worker_performance(agency_id);

ALTER TABLE worker_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view worker performance" ON worker_performance
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );
