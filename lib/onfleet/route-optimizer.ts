// ────────────────────────────────────────────────────────────────────────────
// Route Optimizer — Triggers OnFleet route optimization on a schedule
// Groups tasks by zone, sets completeBefore, triggers auto-assign per team
// ────────────────────────────────────────────────────────────────────────────

import { createOnfleetClient } from './client';
import { calculateCompleteBefore } from './sla-calculator';
import type {
  OnfleetTask,
  ClientDispatchConfig,
  DispatchEvent,
  OptimizationResult,
} from './types';

interface OptimizationRunResult {
  success: boolean;
  tasksProcessed: number;
  tasksUpdated: number; // tasks that had completeBefore set
  teamsOptimized: number;
  errors: string[];
  events: Omit<DispatchEvent, 'id' | 'created_at'>[];
}

/**
 * Run a full optimization cycle:
 * 1. Fetch all unassigned/active tasks
 * 2. Calculate and set optimal completeBefore for each
 * 3. Trigger auto-assign for each team
 */
export async function runOptimization(
  clientId: string,
  config: ClientDispatchConfig,
): Promise<OptimizationRunResult> {
  const client = createOnfleetClient(config.onfleetApiKey);
  const errors: string[] = [];
  const events: Omit<DispatchEvent, 'id' | 'created_at'>[] = [];
  let tasksUpdated = 0;

  // 1. Fetch recent tasks (last 24h)
  const since = Math.floor(Date.now() / 1000) - 86400;
  let tasks: OnfleetTask[];
  try {
    tasks = await client.listTasks(since);
  } catch (err) {
    return {
      success: false,
      tasksProcessed: 0,
      tasksUpdated: 0,
      teamsOptimized: 0,
      errors: [`Failed to fetch tasks: ${err instanceof Error ? err.message : 'Unknown'}`],
      events: [],
    };
  }

  // Filter to unassigned or assigned-but-not-started tasks
  const pendingTasks = tasks.filter((t) => t.status === 0 || t.status === 1);

  // 2. Set completeBefore on tasks that don't have one (or need recalculation)
  for (const task of pendingTasks) {
    try {
      const sla = calculateCompleteBefore(task, config);

      // Only update if the calculated time differs significantly (> 5 min)
      const currentCB = task.completeBefore || 0;
      const diff = Math.abs(sla.completeBefore - currentCB);

      if (diff > 300) {
        await client.updateTask(task.id, {
          completeBefore: sla.completeBefore,
        });
        tasksUpdated++;

        events.push({
          client_id: clientId,
          event_type: 'complete_before_set',
          details: {
            taskId: task.id,
            completeBefore: sla.completeBefore,
            zone: sla.zone?.name ?? 'default',
            targetMinutes: sla.targetMinutes,
            reasoning: sla.reasoning,
          },
          tasks_affected: 1,
          workers_affected: 0,
        });
      }
    } catch (err) {
      errors.push(`Task ${task.shortId}: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  // 3. Trigger auto-assign for each team
  let teamsOptimized = 0;
  try {
    const teams = await client.listTeams();

    for (const team of teams) {
      const result: OptimizationResult = await client.autoAssign(team.id, {
        maxAllowedDelay: (config.defaultSlaTotalMinutes ?? 60) * 60,
        serviceTime: 300, // 5 min per stop default
      });

      if (result.success) {
        teamsOptimized++;
      } else if (result.error) {
        errors.push(`Team "${team.name}": ${result.error}`);
      }
    }
  } catch (err) {
    errors.push(`Team optimization: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  // Log the optimization run event
  events.push({
    client_id: clientId,
    event_type: 'optimization_run',
    details: {
      tasksProcessed: pendingTasks.length,
      tasksUpdated,
      teamsOptimized,
      errors: errors.length > 0 ? errors : undefined,
    },
    tasks_affected: pendingTasks.length,
    workers_affected: teamsOptimized,
  });

  return {
    success: errors.length === 0,
    tasksProcessed: pendingTasks.length,
    tasksUpdated,
    teamsOptimized,
    errors,
    events,
  };
}
