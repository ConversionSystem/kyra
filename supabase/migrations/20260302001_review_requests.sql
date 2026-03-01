-- Review Requests — Automated reputation management
-- Tracks review solicitation, responses, and outcomes.

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  client_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  service TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|sent|positive|negative|review_clicked|no_response|escalated
  rating INTEGER,                          -- 1-5
  feedback TEXT,                           -- Customer's actual response
  review_platform TEXT,                    -- google|yelp|facebook|custom
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_requests_client ON review_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_agency ON review_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(status);
CREATE INDEX IF NOT EXISTS idx_review_requests_created ON review_requests(created_at DESC);

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_reviews" ON review_requests
  FOR ALL USING (true) WITH CHECK (true);
