-- Phase 3: Autonomous Task Engine
-- Worker tasks that execute proactively (SEO audits, lead follow-ups, content calendars, etc.)

CREATE TABLE IF NOT EXISTS worker_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,

  -- Task definition
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN (
    'seo_audit',
    'lead_followup',
    'content_calendar',
    'review_response',
    'competitor_watch',
    'performance_report',
    'custom'
  )),

  -- Trigger configuration
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'schedule',
    'event',
    'manual'
  )),
  schedule_cron TEXT,
  event_type TEXT,

  -- Execution config
  worker_role TEXT NOT NULL,
  custom_prompt TEXT,
  max_tokens INTEGER DEFAULT 4000,
  timeout_seconds INTEGER DEFAULT 120,

  -- State
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_run_result JSONB,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Task execution history
CREATE TABLE IF NOT EXISTS worker_task_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES worker_tasks(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  agency_id UUID NOT NULL,

  -- Execution details
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Results
  result JSONB,
  result_summary TEXT,
  artifacts JSONB,

  -- Cost
  tokens_used INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  model_used TEXT,

  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_worker_tasks_client ON worker_tasks(client_id, enabled);
CREATE INDEX IF NOT EXISTS idx_worker_tasks_next_run ON worker_tasks(next_run_at) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_worker_task_runs_task ON worker_task_runs(task_id, started_at DESC);

ALTER TABLE worker_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_task_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage tasks" ON worker_tasks
  FOR ALL USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));
CREATE POLICY "Agency members can view runs" ON worker_task_runs
  FOR ALL USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));
