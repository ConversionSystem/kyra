-- Add 'beta' to the agencies plan constraint
-- Beta = full access, free during beta period
ALTER TABLE agencies DROP CONSTRAINT IF EXISTS agencies_plan_check;
ALTER TABLE agencies ADD CONSTRAINT agencies_plan_check 
  CHECK (plan IN ('starter', 'pro', 'scale', 'beta'));
