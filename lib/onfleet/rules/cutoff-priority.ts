// ────────────────────────────────────────────────────────────────────────────
// Near-Cutoff Priority Boost — The #1 differentiator
//
// Problem: An order at 4:51 barely misses the 5:00 cutoff → falls into the
// 5:30-6:30 window = 99 minute wait. OnFleet has no native way to handle this.
//
// Solution: Detect near-cutoff orders and set an aggressive completeBefore
// to the FIRST HALF of the next dispatch window, so the OnFleet optimizer
// prioritizes them in the upcoming batch.
// ────────────────────────────────────────────────────────────────────────────

import { createOnfleetClient } from '../client';
import { calculateCompleteBefore } from '../sla-calculator';
import type {
  SlaRule,
  RuleExecutionContext,
  RuleExecutionResult,
  OnfleetTask,
} from '../types';

/**
 * Evaluate the near-cutoff priority boost for a task or batch of tasks.
 *
 * Fires on:
 *  - webhook trigger 12 (taskCreated) → single task
 *  - cron → batch of allPendingTasks
 */
export async function evaluateCutoffPriority(
  rule: SlaRule,
  ctx: RuleExecutionContext,
): Promise<RuleExecutionResult> {
  const cutoffBuffer = (rule.config.cutoffBufferMinutes as number) ?? 10;
  const cycleMinutes = (rule.config.dispatchCycleMinutes as number) ?? 30;
  const cycleMs = cycleMinutes * 60 * 1000;
  const bufferMs = cutoffBuffer * 60 * 1000;

  // Determine which tasks to evaluate
  let tasks: OnfleetTask[] = [];

  if (ctx.trigger === 'webhook' && ctx.triggerId === 12 && ctx.task) {
    // Single new task from webhook
    tasks = [ctx.task];
  } else if (ctx.trigger === 'cron' && ctx.allPendingTasks?.length) {
    // Batch: only evaluate unassigned tasks (state 0) — assigned ones already have routes
    tasks = ctx.allPendingTasks.filter((t) => t.state === 0);
  } else {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type,
      fired: false,
    };
  }

  const client = createOnfleetClient(ctx.config.onfleetApiKey);
  let boostedCount = 0;
  const boostedTasks: Array<{
    taskId: string;
    shortId: string;
    orderTime: string;
    originalWindow: string;
    boostedDeadline: string;
    savedMinutes: number;
  }> = [];

  for (const task of tasks) {
    const orderTimeMs = (task.timeCreated || 0) * 1000;
    if (!orderTimeMs) continue;

    // Find which dispatch cycle this order falls in
    // Cycles align to clock: :00, :30 for 30-min cycles
    const cycleStart = Math.floor(orderTimeMs / cycleMs) * cycleMs;
    const cycleEnd = cycleStart + cycleMs;
    const cutoffThreshold = cycleEnd - bufferMs;

    // Check if the order is within the cutoff buffer of the current cycle
    if (orderTimeMs < cutoffThreshold) continue;

    // This order barely missed the current window.
    // Without boost: dispatched at cycleEnd, delivered by cycleEnd + cycleMs
    // With boost: set completeBefore to first half of next window
    const nextCycleStart = cycleEnd;
    const boostedDeadlineSec = Math.floor((nextCycleStart + cycleMs / 2) / 1000);

    // Only boost if it actually improves the deadline
    const standardSla = calculateCompleteBefore(task, ctx.config);
    if (boostedDeadlineSec >= standardSla.completeBefore) continue;

    // Apply the boost via OnFleet API
    try {
      await client.updateTask(task.id, {
        completeBefore: boostedDeadlineSec,
      });
      boostedCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // 405 = plan doesn't support PATCH — still count as "fired" for logging
      if (!msg.includes('405') && !msg.includes('MethodNotAllowed')) {
        continue;
      }
      boostedCount++;
    }

    const savedMinutes = Math.round((standardSla.completeBefore - boostedDeadlineSec) / 60);

    boostedTasks.push({
      taskId: task.id,
      shortId: task.shortId || task.id.slice(-6),
      orderTime: new Date(orderTimeMs).toISOString(),
      originalWindow: new Date(standardSla.completeBefore * 1000).toISOString(),
      boostedDeadline: new Date(boostedDeadlineSec * 1000).toISOString(),
      savedMinutes,
    });
  }

  if (boostedCount === 0) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type,
      fired: false,
    };
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleType: rule.type,
    fired: true,
    action: `Boosted ${boostedCount} near-cutoff order${boostedCount > 1 ? 's' : ''} to first half of next window`,
    details: { boostedTasks },
    event: {
      client_id: ctx.clientId,
      event_type: 'complete_before_set',
      details: {
        rule: 'near_cutoff_priority_boost',
        boostedCount,
        cutoffBufferMinutes: cutoffBuffer,
        dispatchCycleMinutes: cycleMinutes,
        tasks: boostedTasks,
      },
      tasks_affected: boostedCount,
      workers_affected: 0,
    },
  };
}
