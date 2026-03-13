/**
 * Kyra CRM — TypeScript Interfaces
 * Matches the crm_* tables in 20260227001_crm_core.sql
 */

export interface CrmContact {
  id: string;
  agency_id: string;
  client_id: string | null;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  source: string;
  source_id: string | null;
  stage: 'lead' | 'contact' | 'customer' | 'churned';
  score: number;
  score_label: 'new' | 'cold' | 'warm' | 'hot';
  avatar_color: string | null;
  ai_summary: string | null;
  ai_next_action: string | null;
  ai_last_analyzed_at: string | null;
  last_contacted_at: string | null;
  last_activity_at: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  enrichment_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CrmCompany {
  id: string;
  agency_id: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  revenue_estimate: string | null;
  description: string | null;
  social_links: Record<string, string>;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ActivityType =
  | 'email' | 'sms' | 'call' | 'note' | 'meeting'
  | 'ai_message' | 'stage_change' | 'enrichment'
  | 'score_change' | 'deal_created' | 'task' | 'system';

export interface CrmActivity {
  id: string;
  agency_id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  type: ActivityType;
  subject: string | null;
  body: string | null;
  direction: 'inbound' | 'outbound' | null;
  channel: string | null;
  actor: 'human' | 'ai' | 'system';
  actor_name: string | null;
  metadata: Record<string, unknown>;
  needs_attention: boolean;
  attention_type: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface CrmDeal {
  id: string;
  agency_id: string;
  contact_id: string | null;
  company_id: string | null;
  name: string;
  value: number;
  currency: string;
  stage: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability: number;
  close_date: string | null;
  owner_id: string | null;
  notes: string | null;
  source: string | null;
  source_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContactWithCompany extends CrmContact {
  company?: CrmCompany | null;
}

export interface ContactDetail extends ContactWithCompany {
  activities: CrmActivity[];
  deals: CrmDeal[];
}

export interface CommandFeedItem extends CrmActivity {
  contact?: { id: string; first_name: string | null; last_name: string | null; company_name?: string } | null;
}

export interface CrmFeedResponse {
  attention_items: CommandFeedItem[];
  ai_handled_today: CrmActivity[];
  recent_activities: (CrmActivity & { contact_name?: string; company_name?: string })[];
  stats: {
    total_contacts: number;
    pipeline_value: number;
    hot_leads: number;
    ai_handled_count: number;
  };
}

export interface ContactFilters {
  search?: string;
  stage?: string;
  score_label?: string;
  tag?: string;
  sort?: 'name' | 'score' | 'last_activity' | 'created';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateContactData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  company_name?: string;
  company_id?: string;
  client_id?: string;
  source?: string;
  source_id?: string;
  stage?: CrmContact['stage'];
  tags?: string[];
  enrichment_data?: Record<string, unknown>;
}

export interface CreateCompanyData {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface LogActivityData {
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  type: ActivityType;
  subject?: string;
  body?: string;
  direction?: 'inbound' | 'outbound';
  channel?: string;
  actor?: 'human' | 'ai' | 'system';
  actor_name?: string;
  metadata?: Record<string, unknown>;
  needs_attention?: boolean;
  attention_type?: string;
}

// Avatar color generation
const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500',
  'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-blue-500',
];

export function getAvatarColor(firstName?: string | null, lastName?: string | null): string {
  const str = `${firstName || ''}${lastName || ''}`;
  if (!str) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = (firstName || '')[0] || '';
  const l = (lastName || '')[0] || '';
  return (f + l).toUpperCase() || '?';
}

export function getScoreBadge(score: number, label: string): { color: string; text: string } {
  switch (label) {
    case 'hot': return { color: 'bg-red-100 text-red-700', text: `🔥 Hot (${score})` };
    case 'warm': return { color: 'bg-amber-100 text-amber-700', text: `Warm (${score})` };
    case 'cold': return { color: 'bg-blue-100 text-blue-700', text: `Cold (${score})` };
    default: return { color: 'bg-gray-100 text-gray-600', text: 'New' };
  }
}

export function getStageBadge(stage: string): { color: string; text: string } {
  switch (stage) {
    case 'lead': return { color: 'bg-indigo-100 text-indigo-700', text: 'Lead' };
    case 'contact': return { color: 'bg-purple-100 text-purple-700', text: 'Contact' };
    case 'customer': return { color: 'bg-green-100 text-green-700', text: 'Customer' };
    case 'churned': return { color: 'bg-gray-100 text-gray-500', text: 'Churned' };
    default: return { color: 'bg-gray-100 text-gray-600', text: stage };
  }
}
