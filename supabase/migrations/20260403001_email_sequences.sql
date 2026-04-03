-- ============================================================================
-- Email Sequences (automated multi-step email flows)
-- Agency-level sequences with steps, enrollment tracking, and analytics
-- ============================================================================

-- ── Email Sequences ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  trigger_type TEXT DEFAULT 'manual', -- 'manual', 'tag_added', 'form_submit', 'api'
  trigger_config JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb, -- send window, timezone, etc.
  total_enrolled INT DEFAULT 0,
  total_completed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sequence Steps (individual emails in a sequence) ────────────────────────
CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  subject TEXT NOT NULL DEFAULT '',
  preview_text TEXT DEFAULT '',
  html_body TEXT NOT NULL DEFAULT '',
  delay_days INT NOT NULL DEFAULT 1,    -- days after previous step (or enrollment for step 1)
  delay_hours INT DEFAULT 0,
  step_type TEXT DEFAULT 'custom' CHECK (step_type IN ('intro', 'follow-up', 'value-add', 'closing', 'custom')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  total_sent INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  total_clicked INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sequence Enrollments (contacts in a sequence) ───────────────────────────
CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES email_contacts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  current_step INT DEFAULT 0,           -- which step they're on (0 = just enrolled)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'unsubscribed')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_email_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_email_sequences_agency ON email_sequences(agency_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_status ON email_sequences(status);
CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_seq ON email_sequence_steps(sequence_id, position);
CREATE INDEX IF NOT EXISTS idx_email_sequence_enrollments_seq ON email_sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_sequence_enrollments_status ON email_sequence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_email_sequence_enrollments_next ON email_sequence_enrollments(next_send_at) WHERE status = 'active';
