/**
 * Automation types for Kyra cron/scheduled tasks
 */

export interface Automation {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  /** Cron expression (e.g., "0 8 * * *" for 8am daily) */
  schedule: string;
  /** User's timezone for schedule interpretation */
  timezone: string;
  /** The prompt/instruction to send to the AI */
  prompt: string;
  /** Which channel to deliver the result to */
  delivery_channel: 'web' | 'telegram' | 'whatsapp';
  enabled: boolean;
  /** OpenClaw cron job ID (set after creation) */
  openclaw_job_id?: string;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  schedule: string;
  prompt: string;
  category: 'daily' | 'weekly' | 'custom';
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'morning_brief',
    name: 'Morning Briefing',
    icon: '☀️',
    description: 'Get a daily summary of weather, calendar, and tasks each morning.',
    schedule: '0 8 * * *',
    prompt: 'Good morning! Give me a brief for today: weather, any calendar events, and my pending tasks or reminders. Keep it concise and actionable.',
    category: 'daily',
  },
  {
    id: 'email_digest',
    name: 'Email Digest',
    icon: '📧',
    description: 'Daily summary of important emails and action items.',
    schedule: '0 9 * * *',
    prompt: 'Check my recent emails and give me a digest of anything important or requiring action. Prioritize by urgency.',
    category: 'daily',
  },
  {
    id: 'news_brief',
    name: 'News Briefing',
    icon: '📰',
    description: 'Daily roundup of top news in your industry.',
    schedule: '0 7 * * *',
    prompt: 'Search for the top AI and tech news from today. Give me 5 bullet points of the most important stories with links.',
    category: 'daily',
  },
  {
    id: 'weekly_review',
    name: 'Weekly Review',
    icon: '📊',
    description: 'End-of-week summary and next week planning.',
    schedule: '0 17 * * 5',
    prompt: "It's Friday! Give me a weekly review: summarize what we accomplished this week, any open items, and suggest priorities for next week.",
    category: 'weekly',
  },
  {
    id: 'timesheet_reminder',
    name: 'Timesheet Reminder',
    icon: '⏰',
    description: 'Friday reminder to submit timesheets.',
    schedule: '0 16 * * 5',
    prompt: "Friendly reminder: it's Friday! Don't forget to submit your timesheet for this week.",
    category: 'weekly',
  },
  {
    id: 'standup',
    name: 'Daily Standup Prep',
    icon: '🗣️',
    description: 'Prepare your standup notes each morning.',
    schedule: '0 9 * * 1-5',
    prompt: 'Help me prepare for standup. Based on our recent conversations and tasks, draft what I did yesterday, what I plan to do today, and any blockers.',
    category: 'daily',
  },
];

/**
 * Convert a human-readable schedule to cron expression
 */
export function scheduleToCron(
  type: 'daily' | 'weekdays' | 'weekly' | 'custom',
  hour: number,
  minute: number,
  dayOfWeek?: number,
): string {
  switch (type) {
    case 'daily':
      return `${minute} ${hour} * * *`;
    case 'weekdays':
      return `${minute} ${hour} * * 1-5`;
    case 'weekly':
      return `${minute} ${hour} * * ${dayOfWeek ?? 1}`;
    case 'custom':
      return `${minute} ${hour} * * *`;
    default:
      return `${minute} ${hour} * * *`;
  }
}

/**
 * Parse cron expression to human-readable string
 */
export function cronToHuman(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, , , dow] = parts;
  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  if (dow === '*') return `Daily at ${time}`;
  if (dow === '1-5') return `Weekdays at ${time}`;
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (/^\d$/.test(dow)) return `Every ${days[parseInt(dow)]} at ${time}`;

  return `${cron} at ${time}`;
}
