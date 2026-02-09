export type NotificationType = 
  | 'insight'            // Proactive insight based on memories/context
  | 'reminder_followup'  // Follow-up on past reminders/goals
  | 'calendar_prep'      // Prep for upcoming calendar events
  | 'weekly_summary'     // Weekly activity summary
  | 'nudge'              // Gentle nudge about forgotten tasks/goals
  | 'morning_brief'      // Morning context briefing
  | 'pattern_alert';     // Pattern detected in user behavior

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  read: boolean;
  dismissed: boolean;
  action_url?: string | null;
  action_label?: string | null;
  trigger_reason?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  read_at?: string | null;
  expires_at?: string | null;
}

export interface ProactiveInsight {
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  action_url?: string;
  action_label?: string;
  trigger_reason: string;
  expires_at?: string;
}
