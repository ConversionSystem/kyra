/**
 * Autopilot Engine — Proactive AI Actions
 * 
 * The AI worker doesn't just respond — it acts on its own.
 * Business owners configure a weekly schedule of automated actions.
 * 
 * Default schedule (editable):
 * - Monday: Follow up with hot leads from last week
 * - Tuesday: Check in with customers who had appointments yesterday
 * - Wednesday: Send appointment reminders for tomorrow
 * - Thursday: Follow up on unpaid invoices
 * - Friday: Send review requests to completed jobs this week
 * - Saturday: Weekly performance summary to owner
 * - Sunday: Rest (no actions)
 */

export interface AutopilotAction {
  id: string;
  name: string;
  emoji: string;
  description: string;
  dayOfWeek: number;            // 0=Sun, 1=Mon, ...6=Sat
  timeHour: number;             // 0-23
  timeMinute: number;           // 0-59
  enabled: boolean;
  messageTemplate: string;      // Template for the outgoing message
  targetAudience: string;       // Who receives it
  category: 'follow-up' | 'reminder' | 'review' | 'report' | 'nurture';
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DEFAULT_AUTOPILOT_SCHEDULE: AutopilotAction[] = [
  {
    id: 'monday-lead-followup',
    name: 'Hot Lead Follow-Up',
    emoji: '🔥',
    description: 'Follow up with leads who inquired last week but didn\'t book',
    dayOfWeek: 1,
    timeHour: 9,
    timeMinute: 0,
    enabled: true,
    messageTemplate: 'Hi {{first_name}}! I wanted to follow up on your inquiry from last week. We\'d love to help you with {{service}}. Would you like to schedule a time this week? We have openings {{available_slots}}.',
    targetAudience: 'Leads from past 7 days with no appointment booked',
    category: 'follow-up',
  },
  {
    id: 'tuesday-post-appointment',
    name: 'Post-Appointment Check-In',
    emoji: '💬',
    description: 'Check in with customers who had appointments yesterday',
    dayOfWeek: 2,
    timeHour: 10,
    timeMinute: 0,
    enabled: true,
    messageTemplate: 'Hi {{first_name}}! Just checking in after your visit yesterday. How did everything go? Is there anything else we can help with?',
    targetAudience: 'Customers with appointments completed yesterday',
    category: 'nurture',
  },
  {
    id: 'wednesday-reminders',
    name: 'Appointment Reminders',
    emoji: '📅',
    description: 'Send reminders for tomorrow\'s appointments',
    dayOfWeek: 3,
    timeHour: 14,
    timeMinute: 0,
    enabled: true,
    messageTemplate: 'Hi {{first_name}}! Friendly reminder about your appointment tomorrow at {{time}}. Please arrive 10 minutes early. Reply YES to confirm or let us know if you need to reschedule.',
    targetAudience: 'Customers with appointments tomorrow',
    category: 'reminder',
  },
  {
    id: 'thursday-invoice-followup',
    name: 'Invoice Follow-Up',
    emoji: '💳',
    description: 'Follow up on unpaid invoices from the past 7 days',
    dayOfWeek: 4,
    timeHour: 11,
    timeMinute: 0,
    enabled: true,
    messageTemplate: 'Hi {{first_name}}, I hope you\'re doing well! I\'m reaching out about invoice #{{invoice_number}} for {{amount}}. For your convenience, here\'s a quick payment link: {{payment_link}}. Let me know if you have any questions!',
    targetAudience: 'Contacts with unpaid invoices (7+ days)',
    category: 'follow-up',
  },
  {
    id: 'friday-review-request',
    name: 'Review Requests',
    emoji: '⭐',
    description: 'Ask happy customers from this week to leave a review',
    dayOfWeek: 5,
    timeHour: 15,
    timeMinute: 0,
    enabled: true,
    messageTemplate: 'Hi {{first_name}}! Thank you so much for choosing us this week. We loved working with you! If you have a moment, we\'d really appreciate a quick review — it helps other people find us: {{review_link}}. Thank you! 🙏',
    targetAudience: 'Customers with completed appointments this week',
    category: 'review',
  },
  {
    id: 'saturday-weekly-report',
    name: 'Weekly Performance Report',
    emoji: '📊',
    description: 'Send weekly summary to the business owner',
    dayOfWeek: 6,
    timeHour: 9,
    timeMinute: 0,
    enabled: true,
    messageTemplate: 'Weekly AI Worker Report:\n\n📞 Conversations: {{total_conversations}}\n📅 Appointments booked: {{appointments_booked}}\n⭐ Reviews requested: {{reviews_sent}}\n💰 Revenue influenced: {{revenue}}\n\nTop performing day: {{best_day}}\nSuggestion: {{ai_suggestion}}',
    targetAudience: 'Business owner only',
    category: 'report',
  },
];

/**
 * Get the autopilot schedule, merging defaults with saved config.
 */
export function getSchedule(savedActions?: AutopilotAction[]): AutopilotAction[] {
  if (!savedActions || savedActions.length === 0) {
    return DEFAULT_AUTOPILOT_SCHEDULE;
  }

  // Merge saved with defaults — saved overrides defaults by id
  const merged = DEFAULT_AUTOPILOT_SCHEDULE.map(def => {
    const saved = savedActions.find(s => s.id === def.id);
    return saved ?? def;
  });

  // Add any custom actions that aren't in defaults
  const defaultIds = new Set(DEFAULT_AUTOPILOT_SCHEDULE.map(d => d.id));
  const custom = savedActions.filter(s => !defaultIds.has(s.id));

  return [...merged, ...custom];
}

/**
 * Get actions for a specific day of the week.
 */
export function getActionsForDay(schedule: AutopilotAction[], dayOfWeek: number): AutopilotAction[] {
  return schedule
    .filter(a => a.dayOfWeek === dayOfWeek && a.enabled)
    .sort((a, b) => a.timeHour * 60 + a.timeMinute - (b.timeHour * 60 + b.timeMinute));
}

/**
 * Format time as HH:MM AM/PM.
 */
export function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

/**
 * Count enabled actions per day for the weekly overview.
 */
export function weeklyOverview(schedule: AutopilotAction[]): Array<{ day: string; count: number; actions: string[] }> {
  return DAY_NAMES.map((day, i) => {
    const dayActions = getActionsForDay(schedule, i);
    return {
      day,
      count: dayActions.length,
      actions: dayActions.map(a => `${a.emoji} ${a.name}`),
    };
  });
}

export const CATEGORY_COLORS: Record<string, string> = {
  'follow-up': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'reminder': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'review': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'report': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'nurture': 'bg-green-500/20 text-green-400 border-green-500/30',
};
