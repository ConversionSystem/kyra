-- Proactive Intelligence: Notifications table
-- Stores Kyra-initiated proactive insights and nudges

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'insight',  -- insight, reminder_followup, calendar_prep, weekly_summary, nudge
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',  -- low, normal, high, urgent
  read BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,  -- optional deep link (e.g., /chat?prompt=...)
  action_label TEXT, -- e.g., "Let's discuss", "Review now"
  trigger_reason TEXT,  -- why this was generated (for debugging/learning)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ  -- auto-dismiss after this time
);

-- Indexes
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE AND dismissed = FALSE;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL AND dismissed = FALSE;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage (proactive engine runs server-side)
CREATE POLICY "Service can manage notifications" ON notifications
  FOR ALL WITH CHECK (true);
