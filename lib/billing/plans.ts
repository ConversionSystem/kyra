/**
 * Kyra Plan Configuration
 */

export type Plan = 'free' | 'starter' | 'business' | 'enterprise';

export interface PlanLimits {
  messagesPerMonth: number;
  features: string[];
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    messagesPerMonth: 100,
    features: ['Web chat', 'Basic memory'],
  },
  starter: {
    messagesPerMonth: 1000,
    features: ['Web chat', 'Slack', 'Full memory', 'Google Calendar'],
  },
  business: {
    messagesPerMonth: 5000,
    features: ['Web chat', 'Slack', 'Email', 'Full memory', 'Google Calendar', 'Priority support'],
  },
  enterprise: {
    messagesPerMonth: 25000,
    features: ['All integrations', 'Custom instructions', 'Dedicated support', 'SSO', 'SLA'],
  },
};

export function getPlanLimit(plan: Plan): number {
  return PLAN_LIMITS[plan]?.messagesPerMonth || PLAN_LIMITS.free.messagesPerMonth;
}

export function isWithinLimit(plan: Plan, currentUsage: number): boolean {
  const limit = getPlanLimit(plan);
  return currentUsage < limit;
}

export function getUsagePercentage(plan: Plan, currentUsage: number): number {
  const limit = getPlanLimit(plan);
  return Math.min(100, Math.round((currentUsage / limit) * 100));
}
