// ────────────────────────────────────────────────────────────────────────────
// SLA Calculator — Calculates optimal completeBefore timestamps
// Intercepts new tasks and sets aggressive time windows based on zone SLAs
// ────────────────────────────────────────────────────────────────────────────

import type { OnfleetTask, SlaZone, ClientDispatchConfig } from './types';

interface SlaResult {
  completeBefore: number; // Unix timestamp (seconds)
  zone: SlaZone | null;
  targetMinutes: number;
  reasoning: string;
}

/**
 * Calculate the optimal completeBefore timestamp for a task based on:
 * 1. Which SLA zone the delivery falls into (by zip code)
 * 2. The zone's target delivery time
 * 3. When the order was placed
 *
 * Example: Order at 4:51, zone target 30 min → completeBefore = 5:21
 * Without this, OnFleet would use the next full window (e.g., 6:30)
 */
export function calculateCompleteBefore(
  task: OnfleetTask,
  config: ClientDispatchConfig,
): SlaResult {
  const now = Math.floor(Date.now() / 1000);
  const orderTime = task.timeCreated || now;
  const destZip = task.destination?.address?.postalCode || '';

  // Find the matching zone by zip code
  const zone = findZone(destZip, config.zones);

  // Use zone-specific target or fall back to default
  const targetMinutes = zone?.targetMinutes ?? config.defaultSlaTotalMinutes;

  // completeBefore = order creation time + target SLA minutes
  const completeBefore = orderTime + targetMinutes * 60;

  // If the calculated time is already in the past, set it to now + target
  const finalCompleteBefore = completeBefore < now
    ? now + targetMinutes * 60
    : completeBefore;

  const reasoning = zone
    ? `Zone "${zone.name}" (${destZip}): ${targetMinutes}min SLA`
    : `Default SLA: ${targetMinutes}min (zip ${destZip} not in any zone)`;

  return {
    completeBefore: finalCompleteBefore,
    zone,
    targetMinutes,
    reasoning,
  };
}

/**
 * Check if a completed task met its SLA target
 */
export function checkSlaBreach(
  task: OnfleetTask,
  config: ClientDispatchConfig,
): { breached: boolean; actualMinutes: number; targetMinutes: number; zone: SlaZone | null } {
  const destZip = task.destination?.address?.postalCode || '';
  const zone = findZone(destZip, config.zones);
  const targetMinutes = zone?.targetMinutes ?? config.defaultSlaTotalMinutes;

  const created = task.timeCreated || 0;
  const completed = task.completionDetails?.time || 0;

  if (!created || !completed) {
    return { breached: false, actualMinutes: 0, targetMinutes, zone };
  }

  const actualMinutes = (completed - created) / 60;

  return {
    breached: actualMinutes > targetMinutes,
    actualMinutes: Math.round(actualMinutes),
    targetMinutes,
    zone,
  };
}

/**
 * Find which SLA zone a zip code belongs to
 */
function findZone(zipCode: string, zones: SlaZone[]): SlaZone | null {
  if (!zipCode || !zones?.length) return null;
  const cleaned = zipCode.trim().replace(/\s+/g, '');
  return zones.find((z) => z.zipCodes.includes(cleaned)) ?? null;
}

/**
 * Generate SLA stats for a set of completed tasks
 */
export function calculateSlaStats(
  tasks: OnfleetTask[],
  config: ClientDispatchConfig,
): {
  total: number;
  onTime: number;
  breached: number;
  avgMinutes: number;
  byZone: Record<string, { total: number; onTime: number; avgMinutes: number }>;
} {
  const completed = tasks.filter((t) => t.completionDetails?.time && t.timeCreated);

  if (completed.length === 0) {
    return { total: 0, onTime: 0, breached: 0, avgMinutes: 0, byZone: {} };
  }

  let totalMinutes = 0;
  let onTime = 0;
  let breached = 0;
  const byZone: Record<string, { total: number; onTime: number; totalMinutes: number }> = {};

  for (const task of completed) {
    const result = checkSlaBreach(task, config);
    totalMinutes += result.actualMinutes;

    if (result.breached) {
      breached++;
    } else {
      onTime++;
    }

    const zoneName = result.zone?.name ?? 'Unzoned';
    if (!byZone[zoneName]) {
      byZone[zoneName] = { total: 0, onTime: 0, totalMinutes: 0 };
    }
    byZone[zoneName].total++;
    byZone[zoneName].totalMinutes += result.actualMinutes;
    if (!result.breached) byZone[zoneName].onTime++;
  }

  const zoneStats: Record<string, { total: number; onTime: number; avgMinutes: number }> = {};
  for (const [name, z] of Object.entries(byZone)) {
    zoneStats[name] = {
      total: z.total,
      onTime: z.onTime,
      avgMinutes: Math.round(z.totalMinutes / z.total),
    };
  }

  return {
    total: completed.length,
    onTime,
    breached,
    avgMinutes: Math.round(totalMinutes / completed.length),
    byZone: zoneStats,
  };
}
