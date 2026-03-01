-- Payment Requests — Automated payment collection
-- Tracks invoices sent, reminders, and payment status.

CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  client_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  amount INTEGER NOT NULL,             -- in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  description TEXT NOT NULL,
  service TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|sent|paid|overdue|reminded|escalated|cancelled
  payment_url TEXT,
  stripe_payment_intent_id TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_client ON payment_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_agency ON payment_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_payments" ON payment_requests
  FOR ALL USING (true) WITH CHECK (true);
