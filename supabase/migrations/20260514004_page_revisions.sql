-- ============================================================================
-- Page Version History (2026-05-14, Sprint 4)
--
-- Every PATCH on /api/agency/sites/:id/pages/:slug now writes a snapshot of
-- the PREVIOUS row state into this table before applying the update. That
-- gives customers an undo path: they can browse the last N revisions and
-- one-click restore. Wix/Squarespace have this; agencies will rely on it
-- when they break a page mid-edit.
--
-- Snapshot strategy: store the full editable surface as a JSONB blob rather
-- than diffing fields. Storage is cheap and restoration becomes trivial —
-- write the snapshot back into site_pages and we're done. We deliberately
-- DON'T snapshot html_content for AI-Custom pages: it's a large LLM output
-- that's regenerated, not hand-edited, so versioning it just bloats storage.
--
-- Retention: not enforced at the DB level. App-layer trim keeps the last 30
-- revisions per page so customers always have a meaningful history but the
-- table doesn't grow unbounded for high-churn sites.
-- ============================================================================

CREATE TABLE IF NOT EXISTS page_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES client_sites(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES site_pages(id) ON DELETE CASCADE,
  -- Full editable surface of the previous row state. See PAGE_REVISION_FIELDS
  -- in /app/api/agency/sites/[id]/pages/[slug]/route.ts for the canonical list.
  snapshot JSONB NOT NULL,
  -- Who triggered the save that produced this snapshot. NULL for system-
  -- generated edits (regeneration jobs, etc).
  edited_by UUID REFERENCES auth.users(id),
  -- Free-form short summary of what changed, e.g. "Updated hero headline".
  -- Optional — most rows will just have a timestamp.
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lookups: per-page history feed ordered most-recent-first.
CREATE INDEX IF NOT EXISTS idx_page_revisions_page_created
  ON page_revisions(page_id, created_at DESC);

-- Lookups: per-site retention sweep + agency tab filtering.
CREATE INDEX IF NOT EXISTS idx_page_revisions_site_created
  ON page_revisions(site_id, created_at DESC);

-- RLS: same pattern as site_pages + site_deploys (agency-scoped read,
-- service-role write). Edit on Phase0 RLS migration if you need policy
-- changes here — keep them aligned.
ALTER TABLE page_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON page_revisions;
CREATE POLICY "service_role_all" ON page_revisions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "agency_members_read" ON page_revisions;
CREATE POLICY "agency_members_read" ON page_revisions
  FOR SELECT TO authenticated USING (
    site_id IN (
      SELECT id FROM client_sites
      WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE page_revisions IS
  'Per-save snapshot of site_pages rows. Drives undo / restore in the website editor.';
