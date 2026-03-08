-- Backfill referrals stuck at 'signed_up' → 'activated'
-- These are real signups where email confirmation gate blocked activation.
-- Run once in Supabase SQL Editor.

UPDATE agency_referrals
SET
  status = 'activated',
  referrer_credits_granted = CASE WHEN early_bird THEN 150 ELSE 100 END,
  friend_credits_granted = 100,
  paid_out_at = NOW()
WHERE
  status = 'signed_up'
  AND paid_out_at IS NULL;

-- Verify
SELECT id, status, referrer_id, referred_id, early_bird,
       referrer_credits_granted, friend_credits_granted, paid_out_at
FROM agency_referrals
ORDER BY created_at DESC
LIMIT 20;
