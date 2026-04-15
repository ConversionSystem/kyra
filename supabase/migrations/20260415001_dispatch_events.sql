-- ────────────────────────────────────────────────────────────────────────────
-- Dispatch Events — Logs optimization runs, SLA breaches, notification gates
-- Used by: dispatch cron, route optimizer, notification gate, dispatch tab
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dispatch_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL, -- optimization_run, sla_breach, notification_suppressed, driver_break, route_rebalance, complete_before_set
  details       JSONB DEFAULT '{}',
  tasks_affected INTEGER DEFAULT 0,
  workers_affected INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_dispatch_events_client_id ON dispatch_events(client_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_type ON dispatch_events(event_type);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_created ON dispatch_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_client_created ON dispatch_events(client_id, created_at DESC);

-- RLS
ALTER TABLE dispatch_events ENABLE ROW LEVEL SECURITY;

-- Agency members can view dispatch events for their clients
CREATE POLICY dispatch_events_select ON dispatch_events
  FOR SELECT USING (
    client_id IN (
      SELECT ac.id FROM agency_clients ac
      INNER JOIN agency_members am ON am.agency_id = ac.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- Service role can insert (cron, webhooks)
CREATE POLICY dispatch_events_insert ON dispatch_events
  FOR INSERT WITH CHECK (true);
