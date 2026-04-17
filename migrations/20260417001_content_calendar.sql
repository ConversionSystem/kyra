-- Content Calendar
-- Tracks every piece of content drafted/approved/posted by the scheduled content
-- routines (blog, LinkedIn, Facebook, X). Used by the routines themselves for
-- deduplication (getRecentTopics) and by the /admin/content dashboard for
-- visibility into the editorial pipeline.
--
-- The routines INSERT a row when they draft, UPDATE status to 'approved' when
-- a human marks it reviewed, and UPDATE to 'posted' once it ships.

CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- When the routine ran (date it was drafted for, not necessarily now())
  scheduled_for DATE NOT NULL,

  -- Which surface this is for
  platform TEXT NOT NULL CHECK (platform IN ('blog', 'linkedin', 'facebook', 'x')),

  -- Which content pillar (1–7 per docs/CONTENT-VOICE.md)
  pillar INTEGER NOT NULL CHECK (pillar BETWEEN 1 AND 7),
  pillar_name TEXT NOT NULL,

  -- The angle within the pillar (for dedup — "definitional", "architecture", etc.)
  angle TEXT,

  -- Editorial lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted', 'skipped')),

  -- Content payload
  title TEXT NOT NULL,
  summary TEXT,
  content_url TEXT,           -- Google Drive file URL for social, /blog/<slug> for blog
  pr_url TEXT,                -- GitHub PR URL for blog posts
  slug TEXT,                  -- For blog posts only

  -- Which CTA keyword / lead magnet this post uses
  cta_keyword TEXT,

  -- Tracking
  word_count INTEGER,
  performance_notes TEXT,     -- After-the-fact notes on engagement

  -- Metadata
  created_by TEXT,            -- 'routine:blog' | 'routine:linkedin' | user email for manual edits
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_at TIMESTAMPTZ
);

-- Indexes — optimized for the queries the routines and dashboard make
CREATE INDEX IF NOT EXISTS idx_content_calendar_scheduled
  ON content_calendar(scheduled_for DESC);

CREATE INDEX IF NOT EXISTS idx_content_calendar_platform_pillar
  ON content_calendar(platform, pillar);

CREATE INDEX IF NOT EXISTS idx_content_calendar_dedup
  ON content_calendar(platform, pillar, scheduled_for DESC);

CREATE INDEX IF NOT EXISTS idx_content_calendar_status
  ON content_calendar(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION content_calendar_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_calendar_touch ON content_calendar;
CREATE TRIGGER trg_content_calendar_touch
  BEFORE UPDATE ON content_calendar
  FOR EACH ROW
  EXECUTE FUNCTION content_calendar_touch_updated_at();

-- RLS — admin-only (managed via service role in API; no user-side reads)
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

-- No policies are granted to authenticated users. Access is exclusively through
-- the service-role-authenticated API at /api/admin/content-calendar, which
-- enforces ADMIN_EMAILS allowlist before every read/write.

COMMENT ON TABLE content_calendar IS 'Editorial pipeline for scheduled content routines (blog/linkedin/facebook/x). See docs/CONTENT-VOICE.md for the voice spec and pillar definitions.';
