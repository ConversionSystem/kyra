/**
 * Skills → Container Sync
 *
 * When a user toggles skills on/off in the Skills tab, this module
 * generates a SKILLS.md file and writes it to the container workspace
 * so the AI knows which capabilities are available.
 *
 * Skill definitions are imported from registry.ts (single source of truth).
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { writeWorkspaceFile, wakeContainerAI } from '@/lib/ovh/sync';
import { BUILTIN_SKILLS, type BuiltInSkill } from '@/lib/skills/registry';

// ── Map for O(1) lookups ─────────────────────────────────────────────────────

const BUILTIN_SKILLS_MAP = new Map(BUILTIN_SKILLS.map(s => [s.id, s]));

// ── ClawHub installed skill (from settings) ──────────────────────────────────

interface InstalledClawHubSkill {
  slug: string;
  version: string;
  installed_at: string;
  status: string;
}

// ── Main sync function ───────────────────────────────────────────────────────

/**
 * Read the client's enabled skills from Supabase, generate a SKILLS.md,
 * and write it to the container workspace.
 */
export async function syncSkillsToContainer(clientId: string): Promise<{
  ok: boolean;
  skillCount: number;
  error?: string;
}> {
  const supabase = createServiceClientWithoutCookies();

  // 1. Read client settings + gateway info
  const { data: client, error: fetchErr } = await supabase
    .from('agency_clients')
    .select('settings, gateway_url, gateway_token, gateway_status')
    .eq('id', clientId)
    .single();

  if (fetchErr || !client) {
    return { ok: false, skillCount: 0, error: fetchErr?.message || 'Client not found' };
  }

  const settings = (client.settings as Record<string, unknown>) || {};
  const enabledSkillIds = (settings.enabled_skills as string[]) || [];
  const installedClawHub = (settings.installed_clawhub_skills as InstalledClawHubSkill[]) || [];

  // 2. Map skill IDs to full definitions
  const enabledBuiltins: BuiltInSkill[] = [];
  for (const skillId of enabledSkillIds) {
    const skill = BUILTIN_SKILLS_MAP.get(skillId);
    if (skill) enabledBuiltins.push(skill);
  }

  // 3. Generate SKILLS.md content
  const content = generateSkillsMd(enabledBuiltins, installedClawHub);

  // 4. Write to container workspace
  if (client.gateway_status !== 'running') {
    // Container not running — can't write. This is non-fatal; the file
    // will be written next time the container starts and skills are synced.
    return {
      ok: true,
      skillCount: enabledBuiltins.length + installedClawHub.length,
      error: 'Container not running — SKILLS.md will sync on next start',
    };
  }

  const writeResult = await writeWorkspaceFile(clientId, 'SKILLS.md', content);
  if (!writeResult.ok) {
    return { ok: false, skillCount: 0, error: writeResult.error };
  }

  // 5. Optionally wake the AI so it re-reads workspace files
  if (client.gateway_url && client.gateway_token) {
    await wakeContainerAI(
      client.gateway_url,
      client.gateway_token,
      '[System] Skills configuration updated. Re-read SKILLS.md for your available capabilities.'
    );
  }

  return {
    ok: true,
    skillCount: enabledBuiltins.length + installedClawHub.length,
  };
}

// ── SKILLS.md Generator ──────────────────────────────────────────────────────

function generateSkillsMd(
  builtins: BuiltInSkill[],
  clawHub: InstalledClawHubSkill[]
): string {
  const lines: string[] = [
    '# SKILLS.md — Enabled Capabilities',
    '',
    'These are the skills and tools you have access to. Use them when relevant to help the user.',
    '',
  ];

  if (builtins.length === 0 && clawHub.length === 0) {
    lines.push('_No skills are currently enabled. Basic conversation is available._');
    return lines.join('\n');
  }

  // Built-in skills section
  if (builtins.length > 0) {
    lines.push(`## Built-in Skills (${builtins.length})`);
    lines.push('');
    for (const skill of builtins) {
      lines.push(`### ${skill.icon} ${skill.name}`);
      lines.push(`${skill.description}`);
      lines.push('');
      lines.push(`**Usage:**`);
      lines.push(skill.usage);
      lines.push('');
    }
  }

  // ClawHub installed skills section
  if (clawHub.length > 0) {
    lines.push(`## ClawHub Skills (${clawHub.length})`);
    lines.push('');
    for (const skill of clawHub) {
      lines.push(`### ${skill.slug}`);
      lines.push(`Installed v${skill.version} — Use the \`${skill.slug}\` skill when relevant.`);
      lines.push('');
    }
  }

  // Summary footer
  lines.push('---');
  lines.push(`_${builtins.length + clawHub.length} skills enabled. Check each skill\'s SKILL.md for detailed usage._`);

  return lines.join('\n');
}
