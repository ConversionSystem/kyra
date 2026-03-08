-- Fix agency_referrals status check constraint to include 'activated'
-- 'activated' was added in application code but missing from DB constraint.

ALTER TABLE agency_referrals
DROP CONSTRAINT agency_referrals_status_check;

ALTER TABLE agency_referrals
ADD CONSTRAINT agency_referrals_status_check
CHECK (status IN ('pending', 'signed_up', 'activated', 'converted', 'paid_out'));
