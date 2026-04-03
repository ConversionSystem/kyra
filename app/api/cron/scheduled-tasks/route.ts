/**
 * GET /api/cron/scheduled-tasks
 *
 * Execution engine for Scheduled Tasks + Autopilot actions.
 * Runs every 30 minutes via Vercel cron.
 *
 * For each client that has enabled scheduled tasks or autopilot actions,
 * checks if any are due to run RIGHT NOW and wakes the container to execute them.
 *
 * This is the missing piece: tasks were stored, shown in the UI, but NEVER RAN.
 * Now they do.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getSchedule } from '@/lib/autopilot/autopilot-engine';
import { deductCredits } from '@/lib/billing/credit-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

function isTaskDueNow(schedule: string, lastRunAt: string | null, nowUtc: Date): boolean {
  // Parse cron: "0 9 * * *" = 9am UTC daily, "0 9 * * 1" = Monday 9am UTC
  try {
    const parts = schedule.split(' ');
    if (parts.length !== 5) return false;
    const [min, hour, , , dayOfWeek] = parts.map(p => p === '*' ? -1 : parseInt(p, 10));

    const nowMin = nowUtc.getUTCMinutes();
    const nowHour = nowUtc.getUTCHours();
    const nowDow = nowUtc.getUTCDay(); // 0=Sun, 1=Mon

    // Check time match (within the current 30-min cron window)
    const minuteMatch = min === -1 || Math.abs(nowMin - min) <= 15;
    const hourMatch = hour === -1 || nowHour === hour;
    const dowMatch = dayOfWeek === -1 || nowDow === dayOfWeek;

    if (!hourMatch || !dowMatch) return false;
    if (!minuteMatch) return false;

    // Don't run if already ran in the last 20 minutes
    if (lastRunAt) {
      const lastRun = new Date(lastRunAt).getTime();
      if (Date.now() - lastRun < 20 * 60 * 1000) return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function wakeContainerWithTask(
  gatewayUrl: string,
  gatewayToken: string,
  taskPrompt: string,
  taskName: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Send task as a system event to wake the container
    const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        model: 'openrouter/anthropic/claude-haiku-4.5',
        messages: [
          {
            role: 'system',
            content: `You are executing a scheduled task. Complete it fully and log what you did.`,
          },
          {
            role: 'user',
            content: `[SCHEDULED TASK: ${taskName}]\n\n${taskPrompt}\n\nExecute this task now. Use your available tools (GHL, CRM) as needed. When done, summarize what you did in 1-2 sentences.`,
          },
        ],
        stream: false,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { ok: false, error: `Gateway ${res.status}: ${err.slice(0, 100)}` };
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content || '';
    console.log(`[scheduled-tasks] Task "${taskName}" completed: ${reply.slice(0, 100)}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET(req: NextRequest) {
  // Verify cron auth
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClientWithoutCookies();
  const nowUtc = new Date();
  const log: string[] = [];
  let tasksRun = 0;
  let clientsChecked = 0;

  log.push(`[${nowUtc.toISOString()}] Checking scheduled tasks...`);

  // Get all active clients with running containers
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name, agency_id, settings, gateway_url, gateway_token, gateway_status')
    .in('status', ['active', 'setup'])
    .not('gateway_url', 'is', null)
    .not('gateway_token', 'is', null);

  if (!clients?.length) {
    return NextResponse.json({ ok: true, tasksRun: 0, log });
  }

  for (const client of clients) {
    if (client.gateway_status !== 'running') continue;

    const settings = (client.settings as Record<string, unknown>) || {};
    clientsChecked++;

    // ── 1. Scheduled Tasks ────────────────────────────────────────────────────
    const scheduledTasks = (settings.scheduled_tasks as Array<{
      id: string;
      name: string;
      prompt: string;
      schedule: string;
      enabled: boolean;
      lastRunAt?: string;
    }> | undefined) ?? [];

    const dueTasks = scheduledTasks.filter(t =>
      t.enabled && isTaskDueNow(t.schedule, t.lastRunAt || null, nowUtc)
    );

    for (const task of dueTasks) {
      log.push(`  ${client.name}: Running scheduled task "${task.name}"`);
      const result = await wakeContainerWithTask(
        client.gateway_url as string,
        client.gateway_token as string,
        task.prompt,
        task.name,
      );

      if (result.ok) {
        tasksRun++;
        // Update lastRunAt
        const updatedTasks = scheduledTasks.map(t =>
          t.id === task.id ? { ...t, lastRunAt: nowUtc.toISOString() } : t
        );
        await supabase
          .from('agency_clients')
          .update({ settings: { ...settings, scheduled_tasks: updatedTasks } })
          .eq('id', client.id);
        try {
          await deductCredits(client.agency_id, 'chat.message', {
            clientId: client.id,
            description: `Scheduled task: ${task.name}`,
          });
        } catch { /* non-fatal */ }
        log.push(`    ✅ Done`);
      } else {
        log.push(`    ❌ Failed: ${result.error}`);
      }
    }

    // ── 2. Autopilot Actions ──────────────────────────────────────────────────
    const autopilotEnabled = settings.autopilot_enabled === true;
    if (!autopilotEnabled) continue;

    const savedActions = settings.autopilot_schedule as import('@/lib/autopilot/autopilot-engine').AutopilotAction[] | undefined;
    const schedule = getSchedule(savedActions);
    const dueActions = schedule.filter(action => {
      if (!action.enabled) return false;
      const nowDow = nowUtc.getUTCDay();
      const nowHour = nowUtc.getUTCHours();
      const nowMin = nowUtc.getUTCMinutes();

      const dayMatch = action.dayOfWeek === nowDow;
      const hourMatch = action.timeHour === nowHour;
      const minMatch = Math.abs(action.timeMinute - nowMin) <= 15;

      if (!dayMatch || !hourMatch || !minMatch) return false;

      // Check last run
      const actionsRun = (settings.autopilot_actions_run as number) ?? 0;
      const lastRunAt = settings.autopilot_last_run as string | null;
      if (lastRunAt) {
        const lastRun = new Date(lastRunAt).getTime();
        if (Date.now() - lastRun < 20 * 60 * 1000) return false;
      }

      return true;
    });

    for (const action of dueActions) {
      const prompt = `${action.name}: ${action.messageTemplate}\n\nTarget: ${action.targetAudience}\n\nExecute this action now using your GHL tools. Check GHL for the relevant contacts and send appropriate messages.`;
      log.push(`  ${client.name}: Running autopilot action "${action.name}"`);

      const result = await wakeContainerWithTask(
        client.gateway_url as string,
        client.gateway_token as string,
        prompt,
        action.name,
      );

      if (result.ok) {
        tasksRun++;
        const actionsRun = ((settings.autopilot_actions_run as number) ?? 0) + 1;
        await supabase
          .from('agency_clients')
          .update({
            settings: {
              ...settings,
              autopilot_actions_run: actionsRun,
              autopilot_last_run: nowUtc.toISOString(),
            }
          })
          .eq('id', client.id);
        try {
          await deductCredits(client.agency_id, 'chat.message', {
            clientId: client.id,
            description: `Autopilot action: ${action.name}`,
          });
        } catch { /* non-fatal */ }
        log.push(`    ✅ Done`);
      } else {
        log.push(`    ❌ Failed: ${result.error}`);
      }
    }
  }

  log.push(`Done. Checked ${clientsChecked} clients. Ran ${tasksRun} tasks.`);
  console.log('[scheduled-tasks]', log.join('\n'));

  return NextResponse.json({ ok: true, tasksRun, clientsChecked, log });
}
