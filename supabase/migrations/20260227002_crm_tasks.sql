-- ============================================================================
-- CRM Tasks — AI-generated and human-created tasks
-- Used by autonomous operations (Phase 3) and rule builder
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES crm_deals(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  type text DEFAULT 'follow_up',     -- follow_up, call, email, meeting, review, custom
  priority text DEFAULT 'medium',    -- low, medium, high, urgent
  status text DEFAULT 'pending',     -- pending, in_progress, completed, cancelled
  due_date timestamptz,
  completed_at timestamptz,
  assigned_to text DEFAULT 'ai',     -- 'ai' or user email
  created_by text DEFAULT 'system',  -- 'ai', 'system', or user email
  ai_draft text,                     -- AI-generated draft message for follow-ups
  rule_id text,                      -- Which automation rule created this
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_agency ON crm_tasks(agency_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_contact ON crm_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(agency_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due ON crm_tasks(agency_id, due_date) WHERE status = 'pending';

CREATE TRIGGER crm_tasks_updated_at BEFORE UPDATE ON crm_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_tasks_agency ON crm_tasks
  FOR ALL USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));
