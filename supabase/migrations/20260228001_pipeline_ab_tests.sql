-- Pipeline A/B Testing — Message Optimization Engine
-- Lets agencies test different outreach strategies and auto-optimize towards winners.
-- Run this in Supabase SQL Editor.

-- ─── A/B Test configurations ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, completed
  test_type TEXT NOT NULL DEFAULT 'message', -- message, subject, opener, tone, strategy

  -- Variant definitions (JSONB for flexibility)
  variant_a JSONB NOT NULL DEFAULT '{}',
  -- e.g. { "label": "Professional", "tone": "formal", "instruction": "Write in a professional tone..." }
  variant_b JSONB NOT NULL DEFAULT '{}',
  -- e.g. { "label": "Casual", "tone": "casual", "instruction": "Write like you're texting a friend..." }

  -- Live stats (updated on stage changes)
  stats_a JSONB NOT NULL DEFAULT '{"assigned":0,"sent":0,"opened":0,"replied":0,"interested":0,"booked":0,"closed":0}',
  stats_b JSONB NOT NULL DEFAULT '{"assigned":0,"sent":0,"opened":0,"replied":0,"interested":0,"booked":0,"closed":0}',

  -- Winner determination
  winner TEXT, -- 'a' | 'b' | null
  confidence DECIMAL(5,2), -- statistical confidence (0-100)
  winning_metric TEXT DEFAULT 'replied', -- which metric to optimize: replied, booked, closed
  auto_optimize BOOLEAN DEFAULT true, -- auto-declare winner at 95% confidence
  min_sample_size INTEGER DEFAULT 20, -- min leads per variant before declaring winner

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ─── Track variant assignment on leads ────────────────────────────────────────

ALTER TABLE pipeline_leads ADD COLUMN IF NOT EXISTS ab_test_id UUID;
ALTER TABLE pipeline_leads ADD COLUMN IF NOT EXISTS ab_variant TEXT; -- 'a' | 'b'

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ab_tests_agency ON pipeline_ab_tests(agency_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_campaign ON pipeline_ab_tests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON pipeline_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_leads_ab_test ON pipeline_leads(ab_test_id) WHERE ab_test_id IS NOT NULL;

-- ─── Message Templates Library (for quick variant creation) ───────────────────

CREATE TABLE IF NOT EXISTS pipeline_message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outreach', -- outreach, follow_up, closer
  tone TEXT, -- professional, casual, direct, empathetic, bold
  instruction TEXT NOT NULL, -- AI instruction for generating message in this style
  example_subject TEXT,
  example_message TEXT,
  usage_count INTEGER DEFAULT 0,
  avg_response_rate DECIMAL(5,2), -- historical performance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_agency ON pipeline_message_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON pipeline_message_templates(category);

-- ─── Seed default message templates ───────────────────────────────────────────

-- These are available to all agencies as starting points for A/B tests
-- (agency_id will be set per-agency when they first use the feature)
