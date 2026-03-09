-- Add AI model selection to agency_clients
-- Agencies can now choose which LLM powers each client's AI worker.
-- Different models cost different credits per conversation turn.

ALTER TABLE agency_clients
  ADD COLUMN IF NOT EXISTS ai_model text NOT NULL DEFAULT 'gpt-4o-mini';

-- Index for efficient model-based queries (cost analytics, billing reports)
CREATE INDEX IF NOT EXISTS idx_agency_clients_ai_model ON agency_clients(ai_model);

-- Verify
SELECT ai_model, COUNT(*) as clients
FROM agency_clients
GROUP BY ai_model
ORDER BY clients DESC;
