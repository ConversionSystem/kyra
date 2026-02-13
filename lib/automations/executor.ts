/**
 * OpenClaw cron job executor — syncs automations to the OpenClaw gateway.
 */

import type { Automation } from './types';

const GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const API_KEY = process.env.OPENCLAW_API_KEY || '';

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };
}

/**
 * Create a cron job in OpenClaw for the given automation.
 * Returns the job ID assigned by the gateway.
 */
export async function syncAutomationToOpenClaw(
  automation: Pick<Automation, 'name' | 'schedule' | 'timezone' | 'prompt'>,
): Promise<string> {
  const res = await fetch(`${GATEWAY_URL}/api/cron`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: automation.name,
      schedule: {
        kind: 'cron',
        expr: automation.schedule,
        tz: automation.timezone,
      },
      payload: {
        kind: 'agentTurn',
        message: automation.prompt,
      },
      sessionTarget: 'isolated',
      delivery: { mode: 'announce' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenClaw cron create failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.jobId as string;
}

/**
 * Patch an existing OpenClaw cron job.
 */
export async function updateOpenClawJob(
  jobId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${GATEWAY_URL}/api/cron/${jobId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenClaw cron update failed (${res.status}): ${text}`);
  }
}

/**
 * Delete an OpenClaw cron job.
 */
export async function deleteOpenClawJob(jobId: string): Promise<void> {
  const res = await fetch(`${GATEWAY_URL}/api/cron/${jobId}`, {
    method: 'DELETE',
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenClaw cron delete failed (${res.status}): ${text}`);
  }
}

/**
 * Trigger an immediate run of an OpenClaw cron job.
 */
export async function triggerOpenClawJob(jobId: string): Promise<void> {
  const res = await fetch(`${GATEWAY_URL}/api/cron/${jobId}/run`, {
    method: 'POST',
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenClaw cron trigger failed (${res.status}): ${text}`);
  }
}
