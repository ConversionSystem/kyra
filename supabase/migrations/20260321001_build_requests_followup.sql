-- Add followup_date column to build_requests for CRM-style lead tracking
ALTER TABLE build_requests
  ADD COLUMN IF NOT EXISTS followup_date date,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Index so we can quickly query upcoming follow-ups
CREATE INDEX IF NOT EXISTS idx_build_requests_followup_date
  ON build_requests (followup_date)
  WHERE followup_date IS NOT NULL;
