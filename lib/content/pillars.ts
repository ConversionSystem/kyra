// Content pillars and weekly rotation logic.
// See docs/CONTENT-VOICE.md for full pillar definitions and voice rules.

export type Platform = 'blog' | 'linkedin' | 'facebook' | 'x';
export type ContentStatus = 'draft' | 'approved' | 'posted' | 'skipped';

export interface Pillar {
  id: number; // 1-7
  name: string;
  oneLiner: string;
  /** Short angle ideas the routines can rotate through (30-day dedup per platform). */
  angles: string[];
}

export const PILLARS: Pillar[] = [
  {
    id: 1,
    name: 'What OpenClaw Actually Is',
    oneLiner: 'Explain the technology — gateway, daemon, self-hosted, MIT.',
    angles: [
      'definitional',
      'what-it-replaces',
      'gateway-architecture',
      'open-source-story',
      'vs-chatgpt-wrappers',
      'day-in-the-life',
      'common-misconceptions',
      'origin-story',
    ],
  },
  {
    id: 2,
    name: 'Skills, Tools, and Agent Capabilities',
    oneLiner: 'What agents can actually do — 60+ tools, skills, MCP.',
    angles: [
      'built-in-tools-directory',
      'how-skills-work',
      'writing-your-first-skill',
      'mcp-connectors-explained',
      'tool-allow-deny-lists',
      'sub-agents-pattern',
      'skill-library-precedence',
      'claude-skills-vs-openclaw-skills',
    ],
  },
  {
    id: 3,
    name: 'Multi-Channel AI Deployment',
    oneLiner: 'One gateway, 24+ channels — WhatsApp, Slack, SMS, web.',
    angles: [
      'channel-routing-precedence',
      'whatsapp-setup',
      'telegram-fastest-setup',
      'discord-guild-routing',
      'slack-socket-mode',
      'session-keys-explained',
      'group-vs-dm-isolation',
      'webhook-vs-websocket',
    ],
  },
  {
    id: 4,
    name: 'Self-Hosted vs Cloud AI',
    oneLiner: 'Data sovereignty, cost, control, regulated industries.',
    angles: [
      'data-sovereignty-why-it-matters',
      'cost-comparison',
      'regulated-industry-deployment',
      'tailscale-remote-access',
      'per-client-container-isolation',
      'byo-api-keys',
      'threat-model-summary',
      'when-cloud-is-fine',
    ],
  },
  {
    id: 5,
    name: 'Agent Architecture Patterns',
    oneLiner: 'Memory, sessions, workspaces, sub-agents, compaction.',
    angles: [
      'workspace-layout',
      'soul-md-personality',
      'session-management',
      'memory-systems',
      'compaction-explained',
      'context-engine-pluggable',
      'agents-md-operating-rules',
      'bootstrap-files',
    ],
  },
  {
    id: 6,
    name: 'Automation with Hooks, Cron, and Tasks',
    oneLiner: 'Event-driven AI, scheduled runs, durable flows.',
    angles: [
      'four-automation-types',
      'hooks-28-event-types',
      'cron-job-setup',
      'background-tasks-ledger',
      'task-flow-orchestration',
      'standing-orders',
      'webhook-triggers',
      'bundled-hooks-tour',
    ],
  },
  {
    id: 7,
    name: 'Deploying AI Workers',
    oneLiner: 'Practical step-by-step — from install to first client.',
    angles: [
      'install-in-10-minutes',
      'first-client-config',
      'onboarding-wizard-deep-dive',
      'white-label-pattern',
      'industry-template-library',
      'monitoring-and-logs',
      'scaling-to-10-clients',
      'backup-and-recovery',
    ],
  },
];

/**
 * ISO-8601 week number. Used to deterministically pick the current week's pillar.
 * Reference: https://en.wikipedia.org/wiki/ISO_week_date
 */
export function isoWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/** The pillar that is active for the given date (defaults to today). */
export function currentPillar(date: Date = new Date()): Pillar {
  const week = isoWeekNumber(date);
  const idx = ((week - 1) % PILLARS.length + PILLARS.length) % PILLARS.length;
  return PILLARS[idx];
}

/** Ordered list of pillar + week pairs across a multi-week span (for calendar preview). */
export function weeklyPillarSchedule(weeksAhead: number = 8, startDate: Date = new Date()): Array<{
  weekOf: Date;
  week: number;
  pillar: Pillar;
}> {
  const out: Array<{ weekOf: Date; week: number; pillar: Pillar }> = [];
  for (let i = 0; i < weeksAhead; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i * 7);
    out.push({ weekOf: d, week: isoWeekNumber(d), pillar: currentPillar(d) });
  }
  return out;
}

export function pillarById(id: number): Pillar | undefined {
  return PILLARS.find(p => p.id === id);
}

export const PLATFORMS: Platform[] = ['blog', 'linkedin', 'facebook', 'x'];
export const PLATFORM_LABELS: Record<Platform, string> = {
  blog: 'Blog',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  x: 'X',
};
export const PLATFORM_EMOJIS: Record<Platform, string> = {
  blog: '📝',
  linkedin: '💼',
  facebook: '📘',
  x: '✖️',
};
