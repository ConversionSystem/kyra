-- Add onboarding_steps JSONB column to agencies table
-- Tracks completion of onboarding steps for new agency owners.
-- Each step: { "completed": true, "completed_at": "2026-03-23T..." }

ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{}';

COMMENT ON COLUMN agencies.onboarding_steps IS
  'Tracks onboarding step completion. Keys: profile_completed, first_client_created, first_container_provisioned, stripe_connected, ghl_connected, first_message_sent. Each value: { completed: bool, completed_at: timestamptz }.';
