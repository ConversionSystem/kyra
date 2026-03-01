-- ============================================================================
-- Web Chat Leads — Auto-captured from embeddable chat widget
--
-- When visitors chat via the web widget, the AI extracts contact info
-- and creates leads automatically. Linked to CRM contacts.
-- ============================================================================

-- Web Chat Leads table
CREATE TABLE IF NOT EXISTS web_chat_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  
  -- Contact info (extracted from conversation)
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Lead classification
  interest TEXT,                -- What they're interested in
  urgency TEXT DEFAULT 'warm' CHECK (urgency IN ('hot', 'warm', 'cold')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  
  -- Conversation data
  source_url TEXT,              -- Page URL where they chatted
  conversation_summary TEXT,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  
  -- CRM link
  crm_contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_web_chat_leads_agency ON web_chat_leads(agency_id);
CREATE INDEX IF NOT EXISTS idx_web_chat_leads_client ON web_chat_leads(client_id);
CREATE INDEX IF NOT EXISTS idx_web_chat_leads_status ON web_chat_leads(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_web_chat_leads_urgency ON web_chat_leads(agency_id, urgency);
CREATE INDEX IF NOT EXISTS idx_web_chat_leads_session ON web_chat_leads(session_id);
CREATE INDEX IF NOT EXISTS idx_web_chat_leads_email ON web_chat_leads(agency_id, email);
CREATE INDEX IF NOT EXISTS idx_web_chat_leads_created ON web_chat_leads(agency_id, created_at DESC);

-- Enable RLS
ALTER TABLE web_chat_leads ENABLE ROW LEVEL SECURITY;

-- RLS policies — agencies can only see their own leads
CREATE POLICY "Agencies can view own leads" ON web_chat_leads
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agencies can update own leads" ON web_chat_leads
  FOR UPDATE USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access" ON web_chat_leads
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_web_chat_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER web_chat_leads_updated_at
  BEFORE UPDATE ON web_chat_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_web_chat_leads_updated_at();
