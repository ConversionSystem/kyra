/**
 * Skills → Container Sync
 *
 * When a user toggles skills on/off in the Skills tab, this module
 * generates a SKILLS.md file and writes it to the container workspace
 * so the AI knows which capabilities are available.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { writeWorkspaceFile, wakeContainerAI } from '@/lib/ovh/sync';

// ── Built-in skill definitions (mirrors skills-tab.tsx) ──────────────────────

interface BuiltinSkill {
  id: string;
  name: string;
  description: string;
  usage: string;
}

const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the internet for live information using Perplexity Sonar.',
    usage: 'Use the `web_search` tool to find current information, news, pricing, competitors, or any live data.',
  },
  {
    id: 'web-fetch',
    name: 'Web Scraper',
    description: 'Extract readable content from any URL or webpage.',
    usage: 'Use the `web_fetch` tool to read articles, documentation, product pages, or any public URL.',
  },
  {
    id: 'email',
    name: 'Email (IMAP/SMTP)',
    description: 'Read, send, and manage emails from any configured email account.',
    usage: 'Use the `himalaya` skill to list, read, compose, reply, forward, and search emails.',
  },
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    description: 'Gmail, Calendar, Drive, Sheets, and Docs integration.',
    usage: 'Use the `gog` skill for Gmail, Google Calendar events, Drive files, Sheets data, and Docs.',
  },
  {
    id: 'pdf-analysis',
    name: 'PDF Analysis',
    description: 'Read, analyze, and extract data from PDF documents.',
    usage: 'Use the `pdf` tool to analyze PDF files — extract text, tables, and structured data.',
  },
  {
    id: 'summarize',
    name: 'Summarize',
    description: 'Summarize URLs, podcasts, YouTube videos, and documents.',
    usage: 'Use the `summarize` skill to get concise summaries of web pages, videos, or uploaded documents.',
  },
  {
    id: 'blog-monitor',
    name: 'Blog Monitor',
    description: 'Track RSS feeds, blogs, and news sources for updates.',
    usage: 'Use the `blogwatcher` skill to monitor RSS/Atom feeds and get alerts when new content is published.',
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Current weather conditions and forecasts for any location.',
    usage: 'Use the `weather` skill to get current conditions, forecasts, and weather alerts for any city.',
  },
  {
    id: 'voice-tts',
    name: 'Text-to-Speech',
    description: 'Convert text responses to natural-sounding voice audio.',
    usage: 'Use the `tts` tool to convert text to spoken audio. Useful for voice responses and accessibility.',
  },
  {
    id: 'image-analysis',
    name: 'Image Analysis',
    description: 'Analyze and describe images with vision AI models.',
    usage: 'Use the `image` tool to analyze photos, screenshots, diagrams, or any image content.',
  },
  {
    id: 'browser',
    name: 'Web Browser',
    description: 'Navigate websites, fill forms, take screenshots, and automate web interactions.',
    usage: 'Use the `browser` tool to open URLs, interact with web pages, fill forms, and capture screenshots.',
  },
  {
    id: 'code-execution',
    name: 'Code Runner',
    description: 'Execute code, scripts, and shell commands in a sandboxed environment.',
    usage: 'Use the `exec` tool to run shell commands, scripts, or code snippets.',
  },
  {
    id: 'web-intelligence',
    name: 'Web Intelligence (Firecrawl)',
    description: 'Scrape, crawl, search, and autonomously research any website. Powered by Firecrawl.',
    usage: `Use the firecrawl-cli tool to access the internet:
- firecrawl scrape <url> --only-main-content — read a webpage cleanly
- firecrawl search "<query>" --limit 10 — web search with full content
- firecrawl map <url> — discover all URLs on a site
- firecrawl crawl <url> --limit 50 --wait — crawl an entire website
- firecrawl agent "<prompt>" --wait — autonomous web research (AI finds and extracts data)

Auth is pre-configured via FIRECRAWL_API_KEY and FIRECRAWL_API_URL environment variables.
Use this tool whenever you need live web data: competitor pricing, company research, lead enrichment, industry news, product details.`,
  },
];

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
  const enabledBuiltins: BuiltinSkill[] = [];
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
  builtins: BuiltinSkill[],
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
      lines.push(`### ${skill.name}`);
      lines.push(`${skill.description}`);
      lines.push(`**Usage:** ${skill.usage}`);
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
