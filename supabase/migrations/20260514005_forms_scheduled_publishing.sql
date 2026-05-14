-- ============================================================================
-- Sprint 5 (2026-05-14) — Form Builder + Scheduled Publishing
--
-- This migration adds two independent features that touch the same table
-- so they ship together:
--
--   A) FORM BUILDER  — Customers can define custom form fields per page and
--      collect submissions. The form-embed CTA section reads `cta_form_fields`
--      at render time so the field set is data-driven instead of hardcoded.
--      Submissions land in a new `form_submissions` table; optional
--      webhook URL forwards them to external endpoints (Zapier, n8n, etc.)
--      AND we still push contacts into the agency's CRM via createContact().
--
--   B) SCHEDULED PUBLISHING — `publish_at` TIMESTAMPTZ on site_pages lets
--      customers schedule a draft page to flip live at a future moment. The
--      `/api/cron/publish-scheduled-pages` Vercel cron sweeps every hour and
--      flips overdue pages from hidden=true → hidden=false.
--
-- All new columns / table are nullable / unindexed-by-default; legacy sites
-- behave identically until an agency opts in.
-- ============================================================================

-- ── A. Per-page form definition + webhook target ─────────────────────────
ALTER TABLE site_pages
  ADD COLUMN IF NOT EXISTS cta_form_fields JSONB,
  ADD COLUMN IF NOT EXISTS form_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;

COMMENT ON COLUMN site_pages.cta_form_fields IS
  'Custom form field definitions for the form-embed CTA. Array of { id, label, type, required, placeholder }. NULL = use template defaults (name/phone/email/message).';
COMMENT ON COLUMN site_pages.form_webhook_url IS
  'Optional URL to POST the submission JSON to (Zapier / n8n / custom). NULL = submissions only stored locally and pushed to CRM.';
COMMENT ON COLUMN site_pages.publish_at IS
  'Future timestamp at which a draft page should auto-publish. NULL = manual publish only.';

-- Cron sweep needs an efficient "next pages to publish" lookup. Partial
-- index keeps the index small — only rows with a scheduled time matter.
CREATE INDEX IF NOT EXISTS idx_site_pages_publish_at
  ON site_pages(publish_at)
  WHERE publish_at IS NOT NULL;

-- ── B. Submissions table ─────────────────────────────────────────────────
-- One row per form submission. Keep the raw fields blob so customers can
-- access whatever field set was active at submit time, even if they later
-- edit the form definition.
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES client_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES site_pages(id) ON DELETE SET NULL,
  -- Page slug captured at submit time so we keep history if the page is later
  -- renamed or deleted (page_id FK SET NULL above).
  page_slug TEXT,
  -- Full submission payload — agency-defined field keys.
  fields JSONB NOT NULL,
  -- Common normalized projections (extracted from `fields` at insert time) so
  -- the inbox can sort/filter without parsing JSON in every query.
  email TEXT,
  phone TEXT,
  name TEXT,
  -- Webhook delivery status. NULL = no webhook configured; 'pending' = queued;
  -- 'sent' / 'failed' = post-delivery state. `webhook_status_code` captures
  -- the HTTP code from the external endpoint for debugging.
  webhook_status TEXT,
  webhook_status_code INT,
  webhook_attempts INT DEFAULT 0,
  -- IP + UA for spam analysis (kept short; truncated by app layer).
  source_ip TEXT,
  user_agent TEXT,
  -- Tracking columns
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- crm_contact_id is populated when we successfully push the submission
  -- into the agency's CRM via createContact(). NULL = CRM push failed or
  -- the agency hasn't configured CRM (still has the local submission).
  crm_contact_id UUID
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_site_created
  ON form_submissions(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_page
  ON form_submissions(page_id, created_at DESC);

-- RLS — same agency-scoped pattern as page_revisions / site_deploys.
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON form_submissions;
CREATE POLICY "service_role_all" ON form_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "agency_members_read" ON form_submissions;
CREATE POLICY "agency_members_read" ON form_submissions
  FOR SELECT TO authenticated USING (
    site_id IN (
      SELECT id FROM client_sites
      WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE form_submissions IS
  'Form submissions from the live site form-embed CTA. Joined to client_sites for agency-scoped reads.';
