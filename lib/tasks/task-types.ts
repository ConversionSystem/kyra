// ============================================================================
// Phase 3: Task Engine — Type Definitions
// ============================================================================

export type TaskType =
  | 'seo_audit'
  | 'lead_followup'
  | 'content_calendar'
  | 'review_response'
  | 'competitor_watch'
  | 'performance_report'
  | 'custom';

export type TriggerType = 'schedule' | 'event' | 'manual';

export type TaskRunStatus = 'running' | 'success' | 'failed' | 'timeout';

export interface WorkerTask {
  id: string;
  client_id: string;
  agency_id: string;
  name: string;
  description: string | null;
  task_type: TaskType;
  trigger_type: TriggerType;
  schedule_cron: string | null;
  event_type: string | null;
  worker_role: string;
  custom_prompt: string | null;
  max_tokens: number;
  timeout_seconds: number;
  enabled: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_result: Record<string, unknown> | null;
  next_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkerTaskRun {
  id: string;
  task_id: string;
  client_id: string;
  agency_id: string;
  status: TaskRunStatus;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  result: Record<string, unknown> | null;
  result_summary: string | null;
  artifacts: Record<string, unknown> | null;
  tokens_used: number;
  credits_used: number;
  model_used: string | null;
  error_message: string | null;
}

// ── Task type metadata for UI ───────────────────────────────────────────────

export interface TaskTypeMeta {
  id: TaskType;
  label: string;
  emoji: string;
  description: string;
}

export const TASK_TYPE_META: TaskTypeMeta[] = [
  { id: 'seo_audit', label: 'SEO Audit', emoji: '🔍', description: 'Crawl site, check meta tags, report issues' },
  { id: 'lead_followup', label: 'Lead Follow-Up', emoji: '📞', description: 'Check for unresponded leads, draft follow-ups' },
  { id: 'content_calendar', label: 'Content Calendar', emoji: '📅', description: "Generate next week's social posts as drafts" },
  { id: 'review_response', label: 'Review Response', emoji: '⭐', description: 'Draft responses to new Google reviews' },
  { id: 'competitor_watch', label: 'Competitor Watch', emoji: '🔭', description: 'Check competitor sites for changes' },
  { id: 'performance_report', label: 'Performance Report', emoji: '📊', description: 'Generate weekly performance summary' },
  { id: 'custom', label: 'Custom Task', emoji: '⚙️', description: 'User-defined task with custom prompt' },
];

// ── Schedule presets ────────────────────────────────────────────────────────

export interface SchedulePreset {
  label: string;
  cron: string;
  description: string;
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { label: 'Every day at 9am', cron: '0 9 * * *', description: 'Daily at 9:00 UTC' },
  { label: 'Every Monday at 9am', cron: '0 9 * * 1', description: 'Weekly on Monday at 9:00 UTC' },
  { label: 'Every weekday at 9am', cron: '0 9 * * 1-5', description: 'Mon-Fri at 9:00 UTC' },
  { label: '1st of month at 9am', cron: '0 9 1 * *', description: 'Monthly on the 1st at 9:00 UTC' },
  { label: 'Every 6 hours', cron: '0 */6 * * *', description: 'Every 6 hours' },
  { label: 'Every 12 hours', cron: '0 */12 * * *', description: 'Twice daily' },
];

// ── Suggested tasks per worker role ─────────────────────────────────────────

export interface TaskTemplate {
  name: string;
  task_type: TaskType;
  description: string;
  schedule_cron: string;
  custom_prompt?: string;
}

export const WORKER_TASK_SUGGESTIONS: Record<string, TaskTemplate[]> = {
  // Marketing-related workers
  'social-media-manager': [
    { name: 'Weekly Content Calendar', task_type: 'content_calendar', description: 'Generate social media posts for next week', schedule_cron: '0 9 * * 5' },
    { name: 'Competitor Watch', task_type: 'competitor_watch', description: 'Check competitor activity and content', schedule_cron: '0 9 * * 1' },
    { name: 'Weekly Performance Report', task_type: 'performance_report', description: 'Summarize this week\'s social media performance', schedule_cron: '0 9 * * 1' },
  ],
  'ai-marketing-worker': [
    { name: 'Weekly Content Calendar', task_type: 'content_calendar', description: 'Generate social media posts for next week', schedule_cron: '0 9 * * 5' },
    { name: 'Competitor Watch', task_type: 'competitor_watch', description: 'Monitor competitor changes weekly', schedule_cron: '0 9 * * 1' },
    { name: 'Weekly SEO Audit', task_type: 'seo_audit', description: 'Audit website SEO health', schedule_cron: '0 6 * * 1' },
    { name: 'Weekly Performance Report', task_type: 'performance_report', description: 'Weekly marketing performance summary', schedule_cron: '0 9 * * 1' },
  ],
  // Sales workers
  'sales-qualifier': [
    { name: 'Lead Follow-Up Check', task_type: 'lead_followup', description: 'Draft follow-ups for unresponded leads', schedule_cron: '0 9 * * 1-5' },
    { name: 'Weekly Performance Report', task_type: 'performance_report', description: 'Weekly sales performance summary', schedule_cron: '0 9 * * 1' },
  ],
  'sdr-outbound': [
    { name: 'Lead Follow-Up Check', task_type: 'lead_followup', description: 'Draft follow-ups for cold leads', schedule_cron: '0 9 * * 1-5' },
    { name: 'Weekly Performance Report', task_type: 'performance_report', description: 'Weekly outbound performance summary', schedule_cron: '0 9 * * 1' },
  ],
  // SEO workers
  'seo-writer': [
    { name: 'Weekly SEO Audit', task_type: 'seo_audit', description: 'Full site SEO health check', schedule_cron: '0 6 * * 1' },
    { name: 'Competitor Watch', task_type: 'competitor_watch', description: 'Track competitor SEO changes', schedule_cron: '0 9 * * 1' },
  ],
  // Review workers
  'review-responder': [
    { name: 'Review Response Drafts', task_type: 'review_response', description: 'Draft responses to new reviews', schedule_cron: '0 9 * * *' },
    { name: 'Weekly Performance Report', task_type: 'performance_report', description: 'Weekly review management summary', schedule_cron: '0 9 * * 1' },
  ],
  // Competitor watchers
  'competitor-intelligence': [
    { name: 'Weekly Competitor Watch', task_type: 'competitor_watch', description: 'Deep competitor analysis', schedule_cron: '0 9 * * 1' },
    { name: 'Weekly Performance Report', task_type: 'performance_report', description: 'Weekly competitive intelligence summary', schedule_cron: '0 9 * * 1' },
  ],
  'brand-monitor': [
    { name: 'Competitor Watch', task_type: 'competitor_watch', description: 'Monitor competitor brand activity', schedule_cron: '0 9 * * 1' },
  ],
  // Community / support workers
  'community-manager': [
    { name: 'Weekly Performance Report', task_type: 'performance_report', description: 'Weekly support performance summary', schedule_cron: '0 9 * * 1' },
  ],
  // Catch-all: any worker can use performance reports
  _default: [
    { name: 'Weekly Performance Report', task_type: 'performance_report', description: 'Weekly AI worker performance summary', schedule_cron: '0 9 * * 1' },
  ],
};

/**
 * Get suggested tasks for a given worker role ID.
 * Falls back to default suggestions if no specific ones exist.
 */
export function getSuggestedTasks(workerRoleId: string): TaskTemplate[] {
  return WORKER_TASK_SUGGESTIONS[workerRoleId] ?? WORKER_TASK_SUGGESTIONS._default;
}
