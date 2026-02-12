-- Skills & Automations tables for Kyra
-- Run this in Supabase SQL editor

-- ══════════════════════════════════════════════
-- User Skills (enabled skills per user)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_skills (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  api_key_encrypted TEXT,
  api_key_set BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, skill_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_skills_user_enabled 
  ON user_skills(user_id) WHERE enabled = true;

-- RLS policies
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skills" ON user_skills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own skills" ON user_skills
  FOR ALL USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- Automations (cron jobs per user)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  schedule TEXT NOT NULL, -- cron expression
  timezone TEXT NOT NULL DEFAULT 'UTC',
  prompt TEXT NOT NULL,
  delivery_channel TEXT NOT NULL DEFAULT 'web',
  enabled BOOLEAN NOT NULL DEFAULT true,
  openclaw_job_id TEXT, -- reference to OpenClaw cron job
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_user ON automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_enabled ON automations(user_id) WHERE enabled = true;

-- RLS policies
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automations" ON automations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own automations" ON automations
  FOR ALL USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- Grant service role access (for API routes)
-- ══════════════════════════════════════════════

GRANT ALL ON user_skills TO service_role;
GRANT ALL ON automations TO service_role;
