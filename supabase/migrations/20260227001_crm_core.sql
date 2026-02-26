-- ============================================================================
-- Kyra CRM — Core Tables
-- Phase 1: Contacts, Companies, Activities, Tags
--
-- This is Kyra's native CRM — AI-operated, agency-scoped, credit-gated.
-- Every contact is a relationship the AI actively manages.
-- ============================================================================

-- ─── Companies ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  website text,
  industry text,
  size text,                        -- '1-10', '11-50', '51-200', '200+'
  address text,
  city text,
  state text,
  country text DEFAULT 'US',
  phone text,
  email text,
  revenue_estimate text,
  description text,                 -- AI-generated company brief
  social_links jsonb DEFAULT '{}',
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_companies_agency ON crm_companies(agency_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_name ON crm_companies(agency_id, name);

-- ─── Contacts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  company_id uuid REFERENCES crm_companies(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  email text,
  phone text,
  title text,                       -- "VP of Marketing"
  source text DEFAULT 'manual',     -- 'pipeline', 'import', 'manual', 'ai_worker', 'website', 'ghl'
  source_id text,                   -- pipeline_lead_id, import batch, etc.
  stage text DEFAULT 'lead',        -- lead → contact → customer → churned
  score int DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  score_label text DEFAULT 'new',   -- new → cold → warm → hot
  avatar_color text,
  ai_summary text,                  -- AI relationship brief
  ai_next_action text,              -- "Follow up about pricing"
  ai_last_analyzed_at timestamptz,
  last_contacted_at timestamptz,
  last_activity_at timestamptz,
  tags text[] DEFAULT '{}',
  custom_fields jsonb DEFAULT '{}',
  enrichment_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_agency ON crm_contacts(agency_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(agency_id, email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_phone ON crm_contacts(agency_id, phone);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_stage ON crm_contacts(agency_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_score ON crm_contacts(agency_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_last_activity ON crm_contacts(agency_id, last_activity_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON crm_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_source ON crm_contacts(agency_id, source, source_id);

-- ─── Activities (Unified Timeline) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id uuid REFERENCES crm_companies(id) ON DELETE SET NULL,
  deal_id uuid,                     -- Phase 2: FK to crm_deals
  type text NOT NULL,               -- email, sms, call, note, meeting,
                                    -- ai_message, stage_change, enrichment,
                                    -- score_change, deal_created, task, system
  subject text,
  body text,
  direction text,                   -- inbound, outbound, null for system
  channel text,                     -- ghl, twilio, email, portal, pipeline
  actor text DEFAULT 'human',       -- human, ai, system
  actor_name text,
  metadata jsonb DEFAULT '{}',
  needs_attention boolean DEFAULT false,
  attention_type text,              -- 'reply_needed', 'approval_needed', 'review', 'escalation'
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_agency ON crm_activities(agency_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_company ON crm_activities(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_feed ON crm_activities(agency_id, needs_attention, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(agency_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_created ON crm_activities(agency_id, created_at DESC);

-- ─── Deals (Phase 2 prep — create table now, populate later) ─────────────────
CREATE TABLE IF NOT EXISTS crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES crm_companies(id) ON DELETE SET NULL,
  name text NOT NULL,
  value numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  stage text DEFAULT 'prospect',    -- prospect → qualified → proposal → negotiation → won → lost
  probability int DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
  close_date date,
  owner_id uuid,                    -- agency_member who owns this deal
  notes text,
  source text,                      -- 'pipeline', 'manual', 'ai'
  source_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deals_agency ON crm_deals(agency_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_contact ON crm_deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(agency_id, stage);

-- ─── Add FK from activities to deals now that table exists ───────────────────
ALTER TABLE crm_activities
  ADD CONSTRAINT fk_crm_activities_deal
  FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL;

-- ─── Updated_at triggers ─────────────────────────────────────────────────────
-- Reuse existing trigger function if available
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column() RETURNS trigger AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END$$;

CREATE TRIGGER crm_contacts_updated_at BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER crm_companies_updated_at BEFORE UPDATE ON crm_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER crm_deals_updated_at BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── RLS Policies ────────────────────────────────────────────────────────────
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, agency members see their agency's data
CREATE POLICY crm_contacts_agency ON crm_contacts
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY crm_companies_agency ON crm_companies
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY crm_activities_agency ON crm_activities
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY crm_deals_agency ON crm_deals
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );
