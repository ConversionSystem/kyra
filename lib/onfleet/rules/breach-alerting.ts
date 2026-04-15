// ────────────────────────────────────────────────────────────────────────────
// SLA Breach Alerting — Predictive breach detection + multi-channel alerts
//
// Evaluates pending tasks to predict which will breach their SLA deadline.
// Fires alerts via dashboard events and optional webhook POST.
// ────────────────────────────────────────────────────────────────────────────

import type {
  SlaRule,
  RuleExecutionContext,
  RuleExecutionResult,
  OnfleetTask,
  BreachAlert,
} from '../types';

/**
 * Evaluate pending tasks for predicted SLA breaches.
 *
 * Fires on:
 *  - cron → batch of allPendingTasks
 *  - webhook trigger 2 (ETA update) → single task
 */
export async function evaluateBreachAlert(
  rule: SlaRule,
  ctx: RuleExecutionContext,
): Promise<RuleExecutionResult> {
  const base = {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleType: rule.type as RuleExecutionResult['ruleType'],
  };

  const thresholdMinutes = (rule.config.thresholdMinutes as number) ?? 15;
  const channels = (rule.config.channels as string[]) ?? ['dashboard'];
  const webhookUrl = rule.config.webhookUrl as string | undefined;

  // Determine which tasks to evaluate
  let tasks: OnfleetTask[] = [];

  if (ctx.trigger === 'cron' && ctx.allPendingTasks?.length) {
    // Batch evaluation: all pending tasks with a completeBefore set
    tasks = ctx.allPendingTasks.filter((t) => t.completeBefore);
  } else if (ctx.trigger === 'webhook' && ctx.triggerId === 2 && ctx.task) {
    // Single task ETA update
    if (ctx.task.completeBefore) {
      tasks = [ctx.task];
    }
  } else {
    return { ...base, fired: false };
  }

  if (tasks.length === 0) {
    return { ...base, fired: false };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const alerts: BreachAlert[] = [];

  for (const task of tasks) {
    if (!task.completeBefore) continue;

    // Predict delivery time
    let predictedDeliverySec: number;

    if (task.eta) {
      // OnFleet provides ETA — use it directly
      predictedDeliverySec = task.eta;
    } else if (task.state === 2) {
      // Task is active (in progress) — estimate based on typical remaining time
      // Use half the default SLA as remaining estimate for active tasks
      predictedDeliverySec = nowSec + (ctx.config.defaultSlaTotalMinutes ?? 60) * 30;
    } else {
      // Unassigned/assigned but not started — estimate full SLA from now
      predictedDeliverySec = nowSec + (ctx.config.defaultSlaTotalMinutes ?? 60) * 60;
    }

    const overshootSec = predictedDeliverySec - task.completeBefore;
    const overshootMinutes = Math.round(overshootSec / 60);

    if (overshootMinutes < thresholdMinutes) continue;

    const severity: BreachAlert['severity'] = overshootMinutes >= 30 ? 'critical' : 'warning';

    const targetMinutes = task.completeBefore
      ? Math.round((task.completeBefore - (task.timeCreated || nowSec)) / 60)
      : ctx.config.defaultSlaTotalMinutes ?? 60;

    alerts.push({
      taskId: task.id,
      taskShortId: task.shortId || task.id.slice(-6),
      predictedMinutes: Math.round((predictedDeliverySec - (task.timeCreated || nowSec)) / 60),
      targetMinutes,
      overshootMinutes,
      zone: task.destination?.address?.postalCode || undefined,
      severity,
      createdAt: new Date().toISOString(),
    });
  }

  if (alerts.length === 0) {
    return { ...base, fired: false };
  }

  // Fire webhook alerts (non-blocking)
  if (channels.includes('webhook') && webhookUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sla_breach_alert',
          clientId: ctx.clientId,
          alerts,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      }).catch(() => {}); // fire and forget
      clearTimeout(timeout);
    } catch {
      // Non-fatal — dashboard alerts still logged
    }
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return {
    ...base,
    fired: true,
    action: `Detected ${alerts.length} predicted SLA breach${alerts.length > 1 ? 'es' : ''} (${criticalCount} critical, ${warningCount} warning)`,
    details: { alerts, channels },
    event: {
      client_id: ctx.clientId,
      event_type: 'sla_breach',
      details: {
        rule: 'sla_breach_alerting',
        alertCount: alerts.length,
        criticalCount,
        warningCount,
        thresholdMinutes,
        channels,
        alerts,
      },
      tasks_affected: alerts.length,
      workers_affected: 0,
    },
  };
}
