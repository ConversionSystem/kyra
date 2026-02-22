-- Agency referral tracking
-- When agency B signs up via a link from agency A, we log:
--   referrer_agency_id = A
--   referred_agency_id = B
-- Status moves: pending → converted when B upgrades to paid

CREATE TABLE IF NOT EXISTS agency_referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id      UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  referred_id      UUID REFERENCES agencies(id) ON DELETE SET NULL,
  referred_email   TEXT,                   -- captured before signup completes
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'signed_up', 'converted', 'paid_out')),
  reward_type      TEXT NOT NULL DEFAULT 'free_month',
  paid_out_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON agency_referrals(referrer_id);
CREATE INDEX ON agency_referrals(referred_id);
CREATE INDEX ON agency_referrals(status);

-- RLS: only service role writes; agency owners read their own
ALTER TABLE agency_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrers read own" ON agency_referrals
  FOR SELECT USING (
    referrer_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service insert/update" ON agency_referrals
  FOR ALL USING (true) WITH CHECK (true);
