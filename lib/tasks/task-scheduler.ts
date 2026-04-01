// ============================================================================
// Phase 3: Task Scheduler
//
// Checks for tasks due to run and executes them.
// Called by the cron API route every 15 minutes.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { executeTask } from './task-executor';

/**
 * Check for tasks that are due to run and execute them.
 * Returns a summary of what happened.
 */
export async function checkAndRunDueTasks(): Promise<{
  tasksChecked: number;
  tasksRun: number;
  results: Array<{ taskId: string; taskName: string; success: boolean; error?: string }>;
}> {
  const supabase = createServiceClientWithoutCookies();
  const now = new Date().toISOString();

  // Query tasks that are enabled and due to run
  const { data: dueTasks, error } = await supabase
    .from('worker_tasks')
    .select('id, name, next_run_at')
    .eq('enabled', true)
    .not('next_run_at', 'is', null)
    .lte('next_run_at', now)
    .order('next_run_at', { ascending: true })
    .limit(50); // Process up to 50 tasks per cron run

  if (error || !dueTasks) {
    console.error('[task-scheduler] Failed to query due tasks:', error?.message);
    return { tasksChecked: 0, tasksRun: 0, results: [] };
  }

  console.log(`[task-scheduler] Found ${dueTasks.length} tasks due to run`);

  const results: Array<{ taskId: string; taskName: string; success: boolean; error?: string }> = [];

  // Execute tasks sequentially to avoid overwhelming the API
  for (const task of dueTasks) {
    console.log(`[task-scheduler] Executing task: ${task.name} (${task.id})`);

    try {
      const result = await executeTask(task.id);
      results.push({
        taskId: task.id,
        taskName: task.name,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        console.log(`[task-scheduler] ✅ Task "${task.name}" completed`);
      } else {
        console.log(`[task-scheduler] ❌ Task "${task.name}" failed: ${result.error}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[task-scheduler] Error executing task ${task.id}:`, errorMsg);
      results.push({
        taskId: task.id,
        taskName: task.name,
        success: false,
        error: errorMsg,
      });
    }
  }

  return {
    tasksChecked: dueTasks.length,
    tasksRun: results.filter(r => r.success).length,
    results,
  };
}
