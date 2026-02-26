/**
 * CRM Rule Builder — Triggers → AI Actions → Human Approval
 *
 * Rules are stored in agency settings (JSONB).
 * Each rule: trigger condition → AI action → approval requirement
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logActivity } from './activities';
import { scoreContacts } from './scoring';
import { detectStaleDeals } from './stale-deals';

export interface CrmRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: RuleTrigger;
  action: RuleAction;
  requires_approval: boolean;
  created_at: string;
}

export type RuleTrigger =
  | { type: 'contact_stage_change'; from?: string; to: string }
  | { type: 'deal_stale'; days: number }
  | { type: 'score_above'; threshold: number }
  | { type: 'score_below'; threshold: number }
  | { type: 'no_activity'; days: number }
  | { type: 'inbound_message' }
  | { type: 'deal_won' }
  | { type: 'deal_lost' }
  | { type: 'schedule'; cron: string };

export type RuleAction =
  | { type: 'send_follow_up'; template?: string; channel: 'sms' | 'email' }
  | { type: 'create_task'; title: string; priority: string }
  | { type: 'change_stage'; to: string }
  | { type: 'add_tag'; tag: string }
  | { type: 'score_contacts' }
  | { type: 'detect_stale_deals' }
  | { type: 'notify_owner'; message: string };

export async function getRules(agencyId: string): Promise<CrmRule[]> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  const settings = (data?.settings || {}) as Record<string, unknown>;
  return (settings.crm_rules || []) as CrmRule[];
}

export async function saveRules(agencyId: string, rules: CrmRule[]): Promise<boolean> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  const settings = (data?.settings || {}) as Record<string, unknown>;
  settings.crm_rules = rules;

  const { error } = await svc
    .from('agencies')
    .update({ settings })
    .eq('id', agencyId);

  return !error;
}

export async function executeRule(agencyId: string, rule: CrmRule): Promise<{ executed: boolean; result?: string }> {
  if (!rule.enabled) return { executed: false, result: 'Rule disabled' };

  try {
    switch (rule.action.type) {
      case 'score_contacts': {
        const result = await scoreContacts(agencyId);
        return { executed: true, result: `Scored ${result.scored} contacts` };
      }

      case 'detect_stale_deals': {
        const result = await detectStaleDeals(agencyId);
        return { executed: true, result: `${result.stale} stale, ${result.drafted} drafted` };
      }

      case 'create_task': {
        const svc = createServiceClientWithoutCookies();
        await svc.from('crm_tasks').insert({
          agency_id: agencyId,
          title: rule.action.title,
          priority: rule.action.priority,
          status: 'pending',
          assigned_to: 'ai',
          created_by: 'ai',
          rule_id: rule.id,
        });
        return { executed: true, result: `Task created: ${rule.action.title}` };
      }

      case 'notify_owner': {
        await logActivity(agencyId, {
          type: 'system',
          subject: `Rule: ${rule.name}`,
          body: rule.action.message,
          actor: 'ai',
          actor_name: 'Rule Engine',
          needs_attention: true,
          attention_type: 'review',
        });
        return { executed: true, result: 'Owner notified' };
      }

      default:
        return { executed: false, result: `Unsupported action: ${rule.action.type}` };
    }
  } catch (err) {
    return { executed: false, result: `Error: ${err instanceof Error ? err.message : 'Unknown'}` };
  }
}

// Default rules for new agencies
export function getDefaultRules(): CrmRule[] {
  return [
    {
      id: 'score-weekly',
      name: 'Score all contacts weekly',
      enabled: true,
      trigger: { type: 'schedule', cron: '0 9 * * 1' },
      action: { type: 'score_contacts' },
      requires_approval: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'stale-deals',
      name: 'Detect stale deals (7+ days)',
      enabled: true,
      trigger: { type: 'deal_stale', days: 7 },
      action: { type: 'detect_stale_deals' },
      requires_approval: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'hot-lead-notify',
      name: 'Notify on hot leads (score ≥ 70)',
      enabled: true,
      trigger: { type: 'score_above', threshold: 70 },
      action: { type: 'notify_owner', message: 'A contact just reached hot lead status. Review and take action.' },
      requires_approval: false,
      created_at: new Date().toISOString(),
    },
  ];
}
