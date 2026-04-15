// ────────────────────────────────────────────────────────────────────────────
// Notification Gate — Controls WHEN/WHETHER to send delivery notifications
// Sits between OnFleet webhook and SMS processing to prevent duplicate/spam
//
// Separation of concerns:
//   - lib/sms/    = WHAT/HOW to send (templates, providers, TCPA)
//   - lib/onfleet/ = WHEN/WHETHER to send (gate, cooldown, suppression)
// ────────────────────────────────────────────────────────────────────────────

import type { ClientDispatchConfig } from './types';
import type { OnfleetWebhookPayload } from '@/lib/sms/types';

interface GateDecision {
  allow: boolean;
  reason: string;
  event?: string;
}

/**
 * Evaluate whether a notification should be sent for this webhook event.
 * Returns { allow: true } to proceed, or { allow: false, reason } to suppress.
 *
 * Cooldown is checked via `lastNotificationAt` (epoch ms) which the caller
 * must supply by querying the delivery_sms_log table for the most recent
 * sent SMS for this task. This avoids in-memory state that doesn't survive
 * across Vercel serverless invocations.
 */
export function evaluateNotificationGate(
  payload: OnfleetWebhookPayload,
  dispatchConfig: ClientDispatchConfig | null,
  lastNotificationAt?: number,
): GateDecision {
  // If dispatch is not configured or disabled, allow all notifications (existing behavior)
  if (!dispatchConfig?.enabled) {
    return { allow: true, reason: 'Dispatch not configured — passthrough' };
  }

  const gate = dispatchConfig.notificationGate;
  if (!gate) {
    return { allow: true, reason: 'No notification gate configured — passthrough' };
  }

  const triggerName = payload.triggerName || '';

  // 1. Suppress on task reassignment (prevents duplicate tracking notifications)
  if (gate.suppressOnReassign && triggerName === 'taskAssigned') {
    const task = payload.data?.task;
    if (task && task.timeLastModified && task.timeCreated) {
      const timeSinceCreation = (task.timeLastModified - task.timeCreated);
      // If the task was modified more than 60s after creation, it's likely a reassignment
      if (timeSinceCreation > 60) {
        return {
          allow: false,
          reason: `Reassignment suppressed (task modified ${Math.round(timeSinceCreation / 60)}min after creation)`,
          event: 'notification_suppressed',
        };
      }
    }
  }

  // 2. Suppress during route reoptimization
  if (gate.suppressOnRouteReoptimize && triggerName === 'taskAssigned') {
    const task = payload.data?.task;
    if (task?.status === 1 && lastNotificationAt) {
      const minutesSince = (Date.now() - lastNotificationAt) / 60000;
      if (minutesSince < (gate.cooldownMinutes || 10)) {
        return {
          allow: false,
          reason: `Cooldown active (${Math.round(minutesSince)}min since last, cooldown: ${gate.cooldownMinutes}min)`,
          event: 'notification_suppressed',
        };
      }
    }
  }

  // 3. General cooldown — prevent spamming the same customer
  if (gate.cooldownMinutes > 0 && lastNotificationAt) {
    const minutesSince = (Date.now() - lastNotificationAt) / 60000;
    if (minutesSince < gate.cooldownMinutes) {
      return {
        allow: false,
        reason: `General cooldown (${Math.round(minutesSince)}min since last notification)`,
        event: 'notification_suppressed',
      };
    }
  }

  return { allow: true, reason: 'Passed all gates' };
}
