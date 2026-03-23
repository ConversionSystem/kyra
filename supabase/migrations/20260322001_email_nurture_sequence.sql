-- Email nurture queue for 7-email agency signup sequence
-- Emails are enqueued on agency creation, processed by daily cron

CREATE TABLE IF NOT EXISTS email_nurture_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  sequence_step INTEGER NOT NULL DEFAULT 1,
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_nurture_send_at ON email_nurture_queue(send_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_nurture_agency ON email_nurture_queue(agency_id);
