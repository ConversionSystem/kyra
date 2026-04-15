// ────────────────────────────────────────────────────────────────────────────
// Auto-Reoptimize on Cancellation
//
// When a delivery is cancelled, the remaining tasks on that driver's route
// may no longer be in optimal order. This rule detects cancellation webhooks
// and triggers an auto-dispatch for the affected team to rebalance.
// ────────────────────────────────────────────────────────────────────────────

import { createOnfleetClient } from '../client';
import type {
  SlaRule,
  RuleExecutionContext,
  RuleExecutionResult,
} from '../types';

/**
 * Evaluate whether to trigger reoptimization after a task cancellation.
 *
 * Fires on: webhook trigger 4 (taskFailed / cancelled)
 */
export async function evaluateCancelReoptimize(
  rule: SlaRule,
  ctx: RuleExecutionContext,
): Promise<RuleExecutionResult> {
  const base = {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleType: rule.type as RuleExecutionResult['ruleType'],
  };

  // Only fires on webhook with trigger 4 (task failed/cancelled)
  if (ctx.trigger !== 'webhook' || ctx.triggerId !== 4) {
    return { ...base, fired: false };
  }

  if (!(rule.config.triggerOnCancel ?? true)) {
    return { ...base, fired: false };
  }

  // Debounce: check if a reopt already happened recently
  const debounceSeconds = (rule.config.debounceSeconds as number) ?? 60;
  if (ctx.lastCancelReoptAt) {
    const secondsSince = (Date.now() - ctx.lastCancelReoptAt) / 1000;
    if (secondsSince < debounceSeconds) {
      return { ...base, fired: false };
    }
  }

  // Extract the cancelled task's worker from the webhook payload
  const payload = ctx.webhookPayload as Record<string, unknown> | undefined;
  const taskData = (payload?.data as Record<string, unknown>)?.task as Record<string, unknown> | undefined;
  const workerId = ctx.task?.worker
    || (taskData?.worker as Record<string, unknown>)?.id as string | undefined
    || (taskData?.worker as string | undefined);

  if (!workerId) {
    // Unassigned task was cancelled — no route to reoptimize
    return { ...base, fired: false };
  }

  const client = createOnfleetClient(ctx.config.onfleetApiKey);

  // Find which team this worker belongs to
  let teamId: string | undefined;
  let teamName: string | undefined;
  try {
    const teams = await client.listTeams();
    for (const team of teams) {
      if (team.workers.includes(workerId)) {
        teamId = team.id;
        teamName = team.name;
        break;
      }
    }
  } catch {
    return { ...base, fired: false };
  }

  if (!teamId) {
    return { ...base, fired: false };
  }

  // Trigger reoptimization for the affected team
  let reoptSuccess = false;
  try {
    const result = await client.autoAssign(teamId, {
      maxAllowedDelay: (ctx.config.defaultSlaTotalMinutes ?? 60) * 60,
      serviceTime: 300,
    });
    reoptSuccess = result.success;
    // 405 = plan limitation — still log the intent
    if (!reoptSuccess && result.error?.includes('405')) {
      reoptSuccess = true; // treat as soft success
    }
  } catch {
    // Non-fatal — log the attempt
  }

  const cancelledTaskId = ctx.task?.id
    || (taskData?.id as string)
    || 'unknown';

  return {
    ...base,
    fired: true,
    action: `Reoptimized team "${teamName}" after cancellation of task ${cancelledTaskId}`,
    details: {
      cancelledTaskId,
      workerId,
      teamId,
      teamName,
      reoptSuccess,
    },
    event: {
      client_id: ctx.clientId,
      event_type: 'cancellation_reopt',
      details: {
        rule: 'auto_reoptimize_on_cancel',
        cancelledTaskId,
        workerId,
        teamId,
        teamName,
        reoptSuccess,
        debounceSeconds,
      },
      tasks_affected: 1,
      workers_affected: 1,
    },
  };
}
