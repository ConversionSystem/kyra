-- Per-agency Firecrawl usage tracking
-- Tracks monthly web scrape usage per agency for plan limit enforcement

CREATE TABLE IF NOT EXISTS firecrawl_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  year_month text NOT NULL,          -- e.g. '2026-03'
  scrapes_used integer NOT NULL DEFAULT 0,
  last_scrape_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, year_month)
);

CREATE INDEX IF NOT EXISTS firecrawl_usage_agency_month ON firecrawl_usage(agency_id, year_month);

ALTER TABLE firecrawl_usage ENABLE ROW LEVEL SECURITY;

-- Service role only (all reads/writes are server-side)
CREATE POLICY "service_role_all" ON firecrawl_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Atomic upsert function to avoid race conditions when incrementing usage
CREATE OR REPLACE FUNCTION increment_firecrawl_usage(
  p_agency_id uuid,
  p_year_month text,
  p_cost integer DEFAULT 1
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO firecrawl_usage(agency_id, year_month, scrapes_used, last_scrape_at)
  VALUES (p_agency_id, p_year_month, p_cost, now())
  ON CONFLICT (agency_id, year_month)
  DO UPDATE SET
    scrapes_used = firecrawl_usage.scrapes_used + p_cost,
    last_scrape_at = now();
END;
$$;
