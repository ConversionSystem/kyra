-- Migration: Add 'free' plan to agencies constraint + update plan limits
-- Run: 2026-02-22
--
-- New plan structure:
--   free    → 1 client AI employee  ($0/mo)
--   starter → 5 client AI employees ($97/mo)
--   pro     → 15 client AI employees ($247/mo)
--   scale   → 50 client AI employees ($497/mo)

-- 1. Drop old plan constraint
ALTER TABLE agencies DROP CONSTRAINT IF EXISTS agencies_plan_check;

-- 2. Add new constraint with 'free' included
ALTER TABLE agencies ADD CONSTRAINT agencies_plan_check 
  CHECK (plan IN ('free', 'starter', 'pro', 'scale', 'beta'));

-- 3. Default new agencies to 'free' plan (was 'starter')
ALTER TABLE agencies ALTER COLUMN plan SET DEFAULT 'free';
