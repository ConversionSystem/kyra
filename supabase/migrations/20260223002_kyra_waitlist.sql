CREATE TABLE IF NOT EXISTS kyra_waitlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  industry   TEXT,
  source     TEXT DEFAULT 'landing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kyra_waitlist_created_at ON kyra_waitlist(created_at DESC);
ALTER TABLE kyra_waitlist ENABLE ROW LEVEL SECURITY;
-- Service role only (landing page calls via service key)
