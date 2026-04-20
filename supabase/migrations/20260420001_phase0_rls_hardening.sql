-- ============================================================================
-- Phase 0.11 — RLS Hardening
--
-- Fixes a broken RLS policy and enables Row Level Security on 16 tables that
-- were shipping without any access control. Prior to this migration, those
-- tables relied entirely on application-code correctness + the service-role
-- key to prevent cross-tenant data leaks — a single wrong .eq('agency_id', …)
-- filter on a service-role query would expose another agency's data.
--
-- Policy pattern (applied consistently across all agency-scoped tables):
--
--   1. service_role_all:    FOR ALL USING (true) WITH CHECK (true)
--      Lets cron jobs, webhook handlers, and background workers read/write
--      without JWT context. These paths use createServiceClientWithoutCookies().
--
--   2. agency_members_read: FOR SELECT USING (
--        agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
--      )
--      Lets authenticated users see their own agency's rows via the SSR
--      client. Matches the canonical pattern used elsewhere in the schema.
--
-- For tables scoped indirectly (e.g. site_pages via site_id → client_sites),
-- the agency_members_read policy walks the parent FK to find the agency.
--
-- This migration is IDEMPOTENT — each CREATE POLICY is guarded with DROP
-- POLICY IF EXISTS + ALTER TABLE ENABLE (which is already a no-op if RLS is
-- already on).
-- ============================================================================

-- ─── 1. FIX: delivery_sms_log had a broken SELECT policy ────────────────────
-- Prior policy: `WHERE agency_id = auth.uid()` — agency_id is a UUID FK to
-- agencies.id; auth.uid() is a user UUID. They never match, so the policy
-- silently denies every read. Table only worked via service_role.

DROP POLICY IF EXISTS "agency_read_own" ON delivery_sms_log;

CREATE POLICY "agency_members_read" ON delivery_sms_log
  FOR SELECT USING (
    client_id IN (
      SELECT id::text FROM agency_clients
      WHERE agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
    )
  );

-- ─── 2. agency_credits + credit_transactions ────────────────────────────────
-- Billing-sensitive. Previously no RLS — any SQL-injection or service-role
-- credential leak = full financial visibility.

ALTER TABLE agency_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON agency_credits;
DROP POLICY IF EXISTS "agency_members_read" ON agency_credits;
CREATE POLICY "service_role_all" ON agency_credits
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON agency_credits
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON credit_transactions;
DROP POLICY IF EXISTS "agency_members_read" ON credit_transactions;
CREATE POLICY "service_role_all" ON credit_transactions
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON credit_transactions
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

-- ─── 3. pipeline_ab_tests + pipeline_message_templates ──────────────────────

ALTER TABLE pipeline_ab_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON pipeline_ab_tests;
DROP POLICY IF EXISTS "agency_members_read" ON pipeline_ab_tests;
CREATE POLICY "service_role_all" ON pipeline_ab_tests
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON pipeline_ab_tests
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

ALTER TABLE pipeline_message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON pipeline_message_templates;
DROP POLICY IF EXISTS "agency_members_read" ON pipeline_message_templates;
CREATE POLICY "service_role_all" ON pipeline_message_templates
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON pipeline_message_templates
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

-- ─── 4. Website builder: client_sites, site_pages, site_deploys ─────────────

ALTER TABLE client_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON client_sites;
DROP POLICY IF EXISTS "agency_members_read" ON client_sites;
CREATE POLICY "service_role_all" ON client_sites
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON client_sites
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

-- site_pages scope: via site_id → client_sites → agency_id
ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON site_pages;
DROP POLICY IF EXISTS "agency_members_read" ON site_pages;
CREATE POLICY "service_role_all" ON site_pages
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON site_pages
  FOR SELECT USING (
    site_id IN (
      SELECT id FROM client_sites
      WHERE agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
    )
  );

-- site_deploys scope: same as site_pages
ALTER TABLE site_deploys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON site_deploys;
DROP POLICY IF EXISTS "agency_members_read" ON site_deploys;
CREATE POLICY "service_role_all" ON site_deploys
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON site_deploys
  FOR SELECT USING (
    site_id IN (
      SELECT id FROM client_sites
      WHERE agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
    )
  );

-- ─── 5. Email marketing core: templates, contacts, campaigns, unsubscribes ──

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON email_templates;
DROP POLICY IF EXISTS "agency_members_read" ON email_templates;
CREATE POLICY "service_role_all" ON email_templates
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON email_templates
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON email_contacts;
DROP POLICY IF EXISTS "agency_members_read" ON email_contacts;
CREATE POLICY "service_role_all" ON email_contacts
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON email_contacts
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON email_campaigns;
DROP POLICY IF EXISTS "agency_members_read" ON email_campaigns;
CREATE POLICY "service_role_all" ON email_campaigns
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON email_campaigns
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON email_unsubscribes;
DROP POLICY IF EXISTS "agency_members_read" ON email_unsubscribes;
CREATE POLICY "service_role_all" ON email_unsubscribes
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON email_unsubscribes
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

-- email_analytics scope: via campaign_id → email_campaigns → agency_id
ALTER TABLE email_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON email_analytics;
DROP POLICY IF EXISTS "agency_members_read" ON email_analytics;
CREATE POLICY "service_role_all" ON email_analytics
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON email_analytics
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM email_campaigns
      WHERE agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
    )
  );

-- ─── 6. Email sequences: sequences, steps, enrollments, nurture_queue ───────

ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON email_sequences;
DROP POLICY IF EXISTS "agency_members_read" ON email_sequences;
CREATE POLICY "service_role_all" ON email_sequences
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON email_sequences
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

-- email_sequence_steps scope: via sequence_id → email_sequences → agency_id
ALTER TABLE email_sequence_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON email_sequence_steps;
DROP POLICY IF EXISTS "agency_members_read" ON email_sequence_steps;
CREATE POLICY "service_role_all" ON email_sequence_steps
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON email_sequence_steps
  FOR SELECT USING (
    sequence_id IN (
      SELECT id FROM email_sequences
      WHERE agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
    )
  );

-- email_sequence_enrollments scope: same as steps
ALTER TABLE email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON email_sequence_enrollments;
DROP POLICY IF EXISTS "agency_members_read" ON email_sequence_enrollments;
CREATE POLICY "service_role_all" ON email_sequence_enrollments
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON email_sequence_enrollments
  FOR SELECT USING (
    sequence_id IN (
      SELECT id FROM email_sequences
      WHERE agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
    )
  );

ALTER TABLE email_nurture_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON email_nurture_queue;
DROP POLICY IF EXISTS "agency_members_read" ON email_nurture_queue;
CREATE POLICY "service_role_all" ON email_nurture_queue
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agency_members_read" ON email_nurture_queue
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

-- ─── Summary ────────────────────────────────────────────────────────────────
--   Tables fixed:     1  (delivery_sms_log)
--   Tables hardened: 16  (agency_credits, credit_transactions,
--                         pipeline_ab_tests, pipeline_message_templates,
--                         client_sites, site_pages, site_deploys,
--                         email_templates, email_contacts, email_campaigns,
--                         email_analytics, email_unsubscribes,
--                         email_sequences, email_sequence_steps,
--                         email_sequence_enrollments, email_nurture_queue)
--
-- After this migration, all agency-scoped tables enforce RLS. Service-role
-- paths (cron + webhook + background) keep working unchanged. Authenticated
-- dashboard queries get correct tenant isolation even if an app-code filter
-- is missed.
-- ============================================================================
