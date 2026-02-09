-- Task Pipelines: Multi-step work with checkpointing

CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, paused, completed, failed, cancelled
  steps JSONB NOT NULL DEFAULT '[]',
  current_step INTEGER NOT NULL DEFAULT 0,
  total_credits INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_pipelines_user ON pipelines(user_id, status);
CREATE INDEX idx_pipelines_status ON pipelines(status) WHERE status IN ('running', 'paused');

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pipelines" ON pipelines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own pipelines" ON pipelines
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service can manage pipelines" ON pipelines
  FOR ALL WITH CHECK (true);
