// ============================================================================
// Phase 3: Task Executor
//
// Executes a worker task:
// 1. Loads the task definition
// 2. Builds a task-specific prompt based on task_type
// 3. Calls GPT-4o-mini (or configured model)
// 4. Parses structured output
// 5. Saves the result to worker_task_runs
// 6. Updates the task's last_run status
// ============================================================================

import OpenAI from 'openai';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import type { WorkerTask, TaskType } from './task-types';
import { getNextCronRun } from './cron-utils';

const MODEL = 'gpt-4o-mini';

// ── Built-in task prompts ───────────────────────────────────────────────────

const TASK_PROMPTS: Record<Exclude<TaskType, 'custom'>, string> = {
  seo_audit: `Analyze the website at {url}. Check: meta titles on all pages, meta descriptions, H1 tags, broken links, mobile responsiveness issues, page load concerns, missing alt text. Return a structured JSON report with keys: "score" (0-100), "issues" (array of {page, issue, severity, recommendation}), "summary" (text).`,

  lead_followup: `Review these contacts who haven't received a response in 48+ hours: {contacts}. For each, draft a personalized follow-up message. Return JSON with keys: "followups" (array of {contact_id, contact_name, draft_message, suggested_channel, priority}).`,

  content_calendar: `Generate 5 social media posts for {business_name} in the {industry} industry for next week. Include: LinkedIn (2), Instagram (2), Twitter (1). Return JSON with keys: "posts" (array of {platform, content, suggested_post_date, hashtags, post_type}).`,

  review_response: `Draft professional responses to these customer reviews: {reviews}. Match the tone: grateful for positive, empathetic and solution-oriented for negative. Return JSON with keys: "responses" (array of {review_id, rating, response_draft, tone}).`,

  competitor_watch: `Compare {business_name} website with these competitors: {competitor_urls}. Note: pricing differences, new services, design changes, content gaps. Return JSON with keys: "competitors" (array of {name, url, changes_detected, pricing_notes, content_gaps}), "summary" (text), "recommended_actions" (array of text).`,

  performance_report: `Summarize this week's AI worker performance: {metrics}. Include: total conversations, reply rate, bookings, sentiment score, top customer questions. Format as JSON with keys: "period", "total_conversations", "reply_rate", "bookings", "sentiment_score", "top_questions" (array), "highlights" (array), "recommendations" (array), "summary" (text).`,
};

// ── Context fetchers ────────────────────────────────────────────────────────

async function getClientContext(clientId: string): Promise<Record<string, string>> {
  const supabase = createServiceClientWithoutCookies();

  const { data: client } = await supabase
    .from('agency_clients')
    .select('name, industry, settings')
    .eq('id', clientId)
    .single();

  if (!client) return {};

  const settings = (client.settings as Record<string, unknown>) ?? {};
  const website = (settings.website_url as string) ?? (settings.url as string) ?? '';
  const competitors = (settings.competitors as string[]) ?? [];

  return {
    business_name: client.name ?? 'Business',
    industry: client.industry ?? 'General',
    url: website,
    competitor_urls: competitors.join(', ') || 'N/A',
    contacts: '(latest unresponded contacts from CRM)',
    reviews: '(latest unreviewed customer reviews)',
    metrics: '(this week\'s worker activity metrics)',
  };
}

// ── Build prompt ────────────────────────────────────────────────────────────

function buildPrompt(task: WorkerTask, context: Record<string, string>): string {
  if (task.task_type === 'custom') {
    return task.custom_prompt || 'Execute this custom task and return a JSON result.';
  }

  let prompt = TASK_PROMPTS[task.task_type as Exclude<TaskType, 'custom'>] ?? '';

  // Replace placeholders
  for (const [key, value] of Object.entries(context)) {
    prompt = prompt.replaceAll(`{${key}}`, value);
  }

  // Append task description if available
  if (task.description) {
    prompt += `\n\nAdditional context: ${task.description}`;
  }

  return prompt;
}

// ── Execute task ────────────────────────────────────────────────────────────

export interface TaskExecutionResult {
  success: boolean;
  runId: string;
  summary: string | null;
  error?: string;
}

export async function executeTask(taskId: string): Promise<TaskExecutionResult> {
  const supabase = createServiceClientWithoutCookies();

  // 1. Load task
  const { data: task, error: taskError } = await supabase
    .from('worker_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return { success: false, runId: '', summary: null, error: `Task not found: ${taskId}` };
  }

  const workerTask = task as unknown as WorkerTask;

  // 2. Create run record
  const { data: run, error: runError } = await supabase
    .from('worker_task_runs')
    .insert({
      task_id: taskId,
      client_id: workerTask.client_id,
      agency_id: workerTask.agency_id,
      status: 'running',
      model_used: MODEL,
    })
    .select('id')
    .single();

  if (runError || !run) {
    return { success: false, runId: '', summary: null, error: `Failed to create run: ${runError?.message}` };
  }

  const runId = run.id;
  const startTime = Date.now();

  try {
    // 3. Get client context
    const context = await getClientContext(workerTask.client_id);

    // 4. Build prompt
    const prompt = buildPrompt(workerTask, context);

    // 5. Call GPT-4o-mini
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), (workerTask.timeout_seconds || 120) * 1000);

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await openai.chat.completions.create(
        {
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: `You are an AI worker executing a scheduled task for ${context.business_name || 'a business'}. Your role: ${workerTask.worker_role}. Always respond with valid JSON. Be thorough, actionable, and specific.`,
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: workerTask.max_tokens || 4000,
          response_format: { type: 'json_object' },
          temperature: 0.3,
        },
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeout);
    }

    const content = completion.choices[0]?.message?.content ?? '{}';
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    // 6. Parse result
    let result: Record<string, unknown>;
    try {
      result = JSON.parse(content);
    } catch {
      result = { raw_output: content };
    }

    // Generate summary
    const summary = (result.summary as string)
      ?? `Task "${workerTask.name}" completed successfully with ${Object.keys(result).length} data points.`;

    const durationMs = Date.now() - startTime;

    // 7. Update run
    await supabase
      .from('worker_task_runs')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        result,
        result_summary: summary,
        tokens_used: tokensUsed,
      })
      .eq('id', runId);

    // 8. Update task state
    const nextRun = workerTask.schedule_cron
      ? getNextCronRun(workerTask.schedule_cron)?.toISOString() ?? null
      : null;

    await supabase
      .from('worker_tasks')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: 'success',
        last_run_result: result,
        next_run_at: nextRun,
        run_count: (workerTask.run_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    return { success: true, runId, summary };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const status = isTimeout ? 'timeout' : 'failed';
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Update run as failed
    await supabase
      .from('worker_task_runs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        error_message: errorMessage,
      })
      .eq('id', runId);

    // Update task state
    const nextRun = workerTask.schedule_cron
      ? getNextCronRun(workerTask.schedule_cron)?.toISOString() ?? null
      : null;

    await supabase
      .from('worker_tasks')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: status,
        next_run_at: nextRun,
        run_count: (workerTask.run_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    return { success: false, runId, summary: null, error: errorMessage };
  }
}
