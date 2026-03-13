/**
 * Automations Sync — syncs automation rules to client OpenClaw containers.
 *
 * After creating/updating/deleting automations or event triggers,
 * call syncAutomationsToContainer(clientId) or syncAutomationsToAllClients(agencyId)
 * to write AUTOMATIONS.md to the container workspace so the AI knows
 * what business workflows are automated.
 *
 * Automations and triggers are stored at the agency level (agencies.settings),
 * so when they change we need to sync to ALL active client containers in that agency.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { writeWorkspaceFile, wakeContainerAI } from '@/lib/ovh/sync';

// ── Types ──────────────────────────────────────────────────────────────────

interface Automation {
  id: string;
  name: string;
  schedule: {
    kind: string;
    expr?: string;
    tz?: string;
    everyMs?: number;
    at?: string;
  };
  task: string;
  enabled: boolean;
  lastRun: string | null;
  createdAt: string;
}

interface EventTrigger {
  id: string;
  event: string;
  enabled: boolean;
  action: string;
  delay: number;
  totalFired?: number;
  lastFired?: string | null;
}

// ── Sync to a single client ────────────────────────────────────────────────

/**
 * Sync automations + triggers for a specific client's container.
 * Reads from the client's agency settings and writes AUTOMATIONS.md.
 */
export async function syncAutomationsToContainer(clientId: string): Promise<void> {
  try {
    const supabase = createServiceClientWithoutCookies();

    // Get client's agency_id + gateway info
    const { data: client, error: clientError } = await supabase
      .from('agency_clients')
      .select('id, agency_id, gateway_url, gateway_token, gateway_status')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error(`[automations-sync] Client ${clientId} not found:`, clientError?.message);
      return;
    }

    // Read agency settings for automations + triggers
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('settings')
      .eq('id', client.agency_id)
      .single();

    if (agencyError || !agency) {
      console.error(`[automations-sync] Agency ${client.agency_id} not found:`, agencyError?.message);
      return;
    }

    const settings = (agency.settings ?? {}) as Record<string, unknown>;
    const automations = (settings.automations ?? []) as Automation[];
    const triggers = (settings.event_triggers ?? {}) as Record<string, EventTrigger>;

    // Build and write AUTOMATIONS.md
    const content = buildAutomationsMd(automations, triggers);
    const writeResult = await writeWorkspaceFile(clientId, 'AUTOMATIONS.md', content);

    if (!writeResult.ok) {
      console.error(
        `[automations-sync] Failed to write AUTOMATIONS.md for client ${clientId}:`,
        writeResult.error
      );
      return;
    }

    // Wake the AI
    const gatewayUrl = client.gateway_url as string | null;
    const gatewayToken = client.gateway_token as string | null;
    if (gatewayUrl && gatewayToken && client.gateway_status === 'running') {
      await wakeContainerAI(
        gatewayUrl,
        gatewayToken,
        '[System] Automations updated. Re-read AUTOMATIONS.md for current business workflows and triggers.'
      );
    }

    console.log(`[automations-sync] Synced AUTOMATIONS.md for client ${clientId}`);
  } catch (err) {
    console.error(
      `[automations-sync] Unexpected error for client ${clientId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

// ── Sync to ALL clients in an agency ───────────────────────────────────────

/**
 * Sync automations to all active client containers in an agency.
 * Call this after any automation or trigger CRUD at the agency level.
 */
export async function syncAutomationsToAllClients(agencyId: string): Promise<void> {
  try {
    const supabase = createServiceClientWithoutCookies();

    // Find all active clients with running containers
    const { data: clients, error } = await supabase
      .from('agency_clients')
      .select('id, gateway_url, gateway_token, gateway_status')
      .eq('agency_id', agencyId)
      .not('gateway_url', 'is', null)
      .not('gateway_token', 'is', null);

    if (error || !clients?.length) {
      // No active containers — nothing to sync (not an error)
      if (error) {
        console.error(`[automations-sync] Failed to list clients for agency ${agencyId}:`, error.message);
      }
      return;
    }

    // Read agency settings once
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('settings')
      .eq('id', agencyId)
      .single();

    if (agencyError || !agency) {
      console.error(`[automations-sync] Agency ${agencyId} not found:`, agencyError?.message);
      return;
    }

    const settings = (agency.settings ?? {}) as Record<string, unknown>;
    const automations = (settings.automations ?? []) as Automation[];
    const triggers = (settings.event_triggers ?? {}) as Record<string, EventTrigger>;
    const content = buildAutomationsMd(automations, triggers);

    // Write to all clients in parallel
    const results = await Promise.allSettled(
      clients.map(async (client) => {
        const writeResult = await writeWorkspaceFile(client.id, 'AUTOMATIONS.md', content);
        if (!writeResult.ok) {
          console.error(
            `[automations-sync] Failed to write for client ${client.id}:`,
            writeResult.error
          );
          return;
        }

        // Wake each running container
        const gatewayUrl = client.gateway_url as string | null;
        const gatewayToken = client.gateway_token as string | null;
        if (gatewayUrl && gatewayToken && client.gateway_status === 'running') {
          await wakeContainerAI(
            gatewayUrl,
            gatewayToken,
            '[System] Automations updated. Re-read AUTOMATIONS.md for current business workflows and triggers.'
          );
        }
      })
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`[automations-sync] ${failed}/${clients.length} clients failed to sync`);
    } else {
      console.log(`[automations-sync] Synced AUTOMATIONS.md to ${clients.length} clients in agency ${agencyId}`);
    }
  } catch (err) {
    console.error(
      `[automations-sync] Unexpected error for agency ${agencyId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

// ── Markdown builder ───────────────────────────────────────────────────────

function buildAutomationsMd(
  automations: Automation[],
  triggers: Record<string, EventTrigger>
): string {
  const sections: string[] = [];

  sections.push('# Automations');
  sections.push('');
  sections.push('This file lists all active automation rules and event triggers configured by the business owner.');
  sections.push('It is auto-generated by the dashboard — do not edit manually.');
  sections.push('');

  // ── Scheduled Automations ────────────────────────────────────────────
  const enabledAutomations = automations.filter(a => a.enabled);
  const disabledAutomations = automations.filter(a => !a.enabled);

  sections.push('## Scheduled Automations');
  sections.push('');

  if (enabledAutomations.length === 0 && disabledAutomations.length === 0) {
    sections.push('No scheduled automations configured.');
  } else if (enabledAutomations.length === 0) {
    sections.push('No active scheduled automations. All are currently disabled.');
  } else {
    sections.push('These run on a schedule. You may be woken to execute them:');
    sections.push('');

    for (const auto of enabledAutomations) {
      sections.push(`### ${auto.name}`);
      sections.push('');
      sections.push(`- **Schedule:** ${formatSchedule(auto.schedule)}`);
      sections.push(`- **Task:** ${auto.task}`);
      if (auto.lastRun) {
        sections.push(`- **Last run:** ${auto.lastRun}`);
      }
      sections.push('');
    }
  }

  if (disabledAutomations.length > 0) {
    sections.push('### Disabled Automations');
    sections.push('');
    sections.push('These are configured but currently disabled:');
    sections.push('');
    for (const auto of disabledAutomations) {
      sections.push(`- ~~${auto.name}~~ — ${auto.task}`);
    }
    sections.push('');
  }

  // ── Event Triggers ───────────────────────────────────────────────────
  const triggerList = Object.values(triggers);
  const enabledTriggers = triggerList.filter(t => t.enabled);
  const disabledTriggers = triggerList.filter(t => !t.enabled);

  sections.push('## Event Triggers');
  sections.push('');

  if (enabledTriggers.length === 0 && disabledTriggers.length === 0) {
    sections.push('No event triggers configured.');
  } else if (enabledTriggers.length === 0) {
    sections.push('No active event triggers. All are currently disabled.');
  } else {
    sections.push('These fire automatically when specific events occur:');
    sections.push('');

    for (const trigger of enabledTriggers) {
      sections.push(`- **When:** \`${trigger.event}\` → **Action:** ${trigger.action}`);
      if (trigger.delay > 0) {
        sections.push(`  - *Delay:* ${trigger.delay} seconds before executing`);
      }
      if (trigger.totalFired && trigger.totalFired > 0) {
        sections.push(`  - *Fired:* ${trigger.totalFired} times`);
      }
    }
    sections.push('');
  }

  if (disabledTriggers.length > 0) {
    sections.push('### Disabled Triggers');
    sections.push('');
    for (const trigger of disabledTriggers) {
      sections.push(`- ~~\`${trigger.event}\`~~ → ${trigger.action}`);
    }
    sections.push('');
  }

  // ── Instructions for the AI ──────────────────────────────────────────
  sections.push('## How to Handle Automations');
  sections.push('');
  sections.push('- **Scheduled automations**: When you receive a wake/cron event, check if any scheduled tasks are due and execute them.');
  sections.push('- **Event triggers**: When an event occurs (e.g., new lead, appointment booked), check this file for matching triggers and execute the action.');
  sections.push('- **Disabled items**: Ignore disabled automations and triggers — they are shown for context only.');
  sections.push('- **Do not modify this file** — it is synced from the dashboard automatically.');

  // ── Footer ───────────────────────────────────────────────────────────
  sections.push('');
  sections.push('---');
  sections.push(`*Last synced: ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatSchedule(schedule: Automation['schedule']): string {
  switch (schedule.kind) {
    case 'cron':
      return `Cron \`${schedule.expr}\` (${schedule.tz || 'UTC'})`;
    case 'every': {
      const ms = schedule.everyMs || 0;
      if (ms >= 86400000) return `Every ${Math.round(ms / 86400000)} day(s)`;
      if (ms >= 3600000) return `Every ${Math.round(ms / 3600000)} hour(s)`;
      if (ms >= 60000) return `Every ${Math.round(ms / 60000)} minute(s)`;
      return `Every ${Math.round(ms / 1000)} second(s)`;
    }
    case 'at':
      return `Once at ${schedule.at}`;
    default:
      return JSON.stringify(schedule);
  }
}
