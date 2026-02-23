-- Kyra Credits: agency credit balances + transaction log

CREATE TABLE IF NOT EXISTS agency_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  lifetime_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'manual')),
  description TEXT,
  client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_agency ON credit_transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);

-- Auto-create credit balance record when a new agency is created
CREATE OR REPLACE FUNCTION create_agency_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agency_credits (agency_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_agency_created_credits ON agencies;
CREATE TRIGGER on_agency_created_credits
  AFTER INSERT ON agencies
  FOR EACH ROW EXECUTE FUNCTION create_agency_credits();

-- Backfill credits record for existing agencies
INSERT INTO agency_credits (agency_id)
SELECT id FROM agencies
ON CONFLICT DO NOTHING;
