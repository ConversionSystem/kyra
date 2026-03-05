-- Referral Machine — Early Bird columns
-- Tracks whether a referral was made within 48hrs of the referrer signing up
-- and exactly how many credits each side received.

ALTER TABLE agency_referrals
  ADD COLUMN IF NOT EXISTS early_bird BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS referrer_credits_granted INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS friend_credits_granted INT DEFAULT 0;

-- Index for streak queries (referrals by referrer in last 7 days)
CREATE INDEX IF NOT EXISTS idx_agency_referrals_referrer_created
  ON agency_referrals(referrer_id, created_at DESC);
