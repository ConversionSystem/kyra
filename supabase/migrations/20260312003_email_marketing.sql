-- ============================================================================
-- Email Marketing System
-- Tables: email_campaigns, email_templates, email_contacts, email_analytics, email_unsubscribes
-- ============================================================================

-- ── Email Templates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES agency_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  category TEXT DEFAULT 'custom', -- 'welcome', 'promotion', 'newsletter', 'follow-up', 'announcement', 'custom'
  industry TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- system templates can't be deleted
  variables JSONB DEFAULT '[]'::jsonb, -- [{key, label, default}]
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Email Contacts (marketing list) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES agency_clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'manual', -- 'manual', 'import', 'widget', 'crm', 'api'
  status TEXT DEFAULT 'active', -- 'active', 'unsubscribed', 'bounced', 'complained'
  metadata JSONB DEFAULT '{}'::jsonb,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, client_id, email)
);

-- ── Email Campaigns ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES agency_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT,
  html_body TEXT NOT NULL,
  text_body TEXT,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  segment_tags TEXT[] DEFAULT '{}', -- empty = all contacts
  segment_query JSONB, -- advanced segment rules
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INT DEFAULT 0,
  total_sent INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  total_clicked INT DEFAULT 0,
  total_bounced INT DEFAULT 0,
  total_complained INT DEFAULT 0,
  total_unsubscribed INT DEFAULT 0,
  resend_batch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Email Analytics (per-recipient tracking) ────────────────────────────────
CREATE TABLE IF NOT EXISTS email_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES email_contacts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  event TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'
  metadata JSONB DEFAULT '{}'::jsonb, -- click URL, bounce reason, etc.
  resend_email_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Unsubscribes (global per agency) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT, -- 'manual', 'link', 'complaint', 'bounce'
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, email)
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_email_contacts_agency ON email_contacts(agency_id);
CREATE INDEX IF NOT EXISTS idx_email_contacts_client ON email_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_email_contacts_status ON email_contacts(status);
CREATE INDEX IF NOT EXISTS idx_email_contacts_tags ON email_contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_agency ON email_campaigns(agency_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_client ON email_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_analytics_campaign ON email_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_agency ON email_unsubscribes(agency_id);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email);
