/**
 * CRM Intelligence
 *
 * 1. Competitive Intelligence — tracks competitor mentions in conversations
 * 2. Revenue Forecasting — AI-predicted close probability from sentiment
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logActivity } from './activities';
import { deductCredits, getAgencyCredits } from '@/lib/billing/credit-engine';

// ─── Competitive Intelligence ────────────────────────────────────────────────

const COMMON_COMPETITORS = [
  'hubspot', 'salesforce', 'gohighlevel', 'highlevel', 'ghl',
  'pipedrive', 'zoho', 'freshsales', 'close.com', 'copper',
  'monday', 'notion', 'airtable', 'stammer', 'xcloud',
  'chatgpt', 'jasper', 'drift', 'intercom', 'zendesk',
];

export interface CompetitorMention {
  competitor: string;
  context: string;
  sentiment: 'comparing' | 'leaving' | 'considering' | 'neutral';
  contact_id: string;
  contact_name: string;
  detected_at: string;
}

/**
 * Scan a conversation for competitor mentions
 */
export function detectCompetitorMentions(
  text: string,
  contactId: string,
  contactName: string,
): CompetitorMention[] {
  const lower = text.toLowerCase();
  const mentions: CompetitorMention[] = [];

  for (const comp of COMMON_COMPETITORS) {
    if (lower.includes(comp)) {
      // Extract surrounding context (±50 chars)
      const idx = lower.indexOf(comp);
      const start = Math.max(0, idx - 50);
      const end = Math.min(text.length, idx + comp.length + 50);
      const context = text.slice(start, end).trim();

      // Determine sentiment
      let sentiment: CompetitorMention['sentiment'] = 'neutral';
      if (/switch|leav|migrat|mov|replac/i.test(context)) sentiment = 'leaving';
      else if (/compar|vs|versus|differ|better|worse/i.test(context)) sentiment = 'comparing';
      else if (/look|consider|evaluat|check|try/i.test(context)) sentiment = 'considering';

      mentions.push({
        competitor: comp,
        context,
        sentiment,
        contact_id: contactId,
        contact_name: contactName,
        detected_at: new Date().toISOString(),
      });
    }
  }

  return mentions;
}

/**
 * Log competitor mentions to CRM
 */
export async function logCompetitorMentions(
  agencyId: string,
  mentions: CompetitorMention[],
): Promise<void> {
  if (!mentions.length) return;

  for (const mention of mentions) {
    await logActivity(agencyId, {
      contact_id: mention.contact_id,
      type: 'system',
      subject: `Competitor detected: ${mention.competitor}`,
      body: `${mention.contact_name} mentioned ${mention.competitor} (${mention.sentiment}). Context: "${mention.context}"`,
      actor: 'ai',
      actor_name: 'Competitive Intelligence',
      needs_attention: mention.sentiment === 'comparing' || mention.sentiment === 'leaving',
      attention_type: mention.sentiment === 'comparing' ? 'review' : undefined,
      metadata: {
        competitor: mention.competitor,
        sentiment: mention.sentiment,
      },
    });
  }
}

// ─── Revenue Forecasting ─────────────────────────────────────────────────────

export interface DealForecast {
  deal_id: string;
  deal_name: string;
  stage: string;
  value: number;
  stage_probability: number;     // Standard stage-based probability
  ai_probability: number;        // AI-predicted from conversation sentiment
  confidence: number;            // How confident AI is in its prediction
  reasoning: string;
  predicted_close_date: string | null;
  risk_factors: string[];
  positive_signals: string[];
}

/**
 * AI-predict close probability for all active deals
 */
export async function forecastDeals(agencyId: string): Promise<{
  forecasts: DealForecast[];
  total_weighted_pipeline: number;
  total_ai_weighted_pipeline: number;
}> {
  const svc = createServiceClientWithoutCookies();

  const creditBalance = await getAgencyCredits(agencyId);
  if (creditBalance.balance < 2) {
    return { forecasts: [], total_weighted_pipeline: 0, total_ai_weighted_pipeline: 0 };
  }

  // Get active deals with contacts
  const { data: deals } = await svc
    .from('crm_deals')
    .select('*, crm_contacts!crm_deals_contact_id_fkey(id, first_name, last_name, enrichment_data)')
    .eq('agency_id', agencyId)
    .in('stage', ['prospect', 'qualified', 'proposal', 'negotiation']);

  if (!deals?.length) {
    return { forecasts: [], total_weighted_pipeline: 0, total_ai_weighted_pipeline: 0 };
  }

  // Get recent activities for each deal's contact
  const contactIds = deals
    .map(d => (d as Record<string, unknown>).crm_contacts as Record<string, unknown> | null)
    .filter(Boolean)
    .map(c => c!.id as string);

  const { data: recentActivities } = await svc
    .from('crm_activities')
    .select('contact_id, type, direction, body, actor, created_at')
    .eq('agency_id', agencyId)
    .in('contact_id', contactIds)
    .order('created_at', { ascending: false })
    .limit(200);

  // Group activities by contact
  const actByContact = new Map<string, Array<Record<string, unknown>>>();
  for (const act of (recentActivities || [])) {
    const list = actByContact.get(act.contact_id) || [];
    list.push(act);
    actByContact.set(act.contact_id, list);
  }

  // Forecast each deal
  const forecasts: DealForecast[] = [];

  for (const rawDeal of deals) {
    const contact = (rawDeal as Record<string, unknown>).crm_contacts as Record<string, unknown> | null;
    const contactId = contact?.id as string | undefined;
    const contactActivities = contactId ? actByContact.get(contactId) || [] : [];

    const forecast = analyzeDeal(rawDeal as Record<string, unknown>, contact, contactActivities);
    forecasts.push(forecast);
  }

  // Calculate weighted pipeline
  const total_weighted_pipeline = forecasts.reduce((sum, f) => sum + (f.value * f.stage_probability / 100), 0);
  const total_ai_weighted_pipeline = forecasts.reduce((sum, f) => sum + (f.value * f.ai_probability / 100), 0);

  // Deduct 1 credit for forecasting
  await deductCredits(agencyId, 'crm_scoring', { description: `Revenue forecast for ${forecasts.length} deals` });

  return { forecasts, total_weighted_pipeline, total_ai_weighted_pipeline };
}

function analyzeDeal(
  deal: Record<string, unknown>,
  contact: Record<string, unknown> | null,
  activities: Array<Record<string, unknown>>,
): DealForecast {
  const stageProbMap: Record<string, number> = {
    prospect: 10, qualified: 25, proposal: 50, negotiation: 75,
  };
  const stage = deal.stage as string;
  const stageProbability = stageProbMap[stage] || 10;

  const riskFactors: string[] = [];
  const positiveSignals: string[] = [];

  // Analyze activity patterns
  const inboundCount = activities.filter(a => a.direction === 'inbound').length;
  const outboundCount = activities.filter(a => a.direction === 'outbound').length;
  const totalActivities = activities.length;

  const lastActivity = activities[0];
  const daysSinceActivity = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity.created_at as string).getTime()) / 86400000)
    : 999;

  // Sentiment signals
  let sentimentBoost = 0;

  if (inboundCount >= 3) { positiveSignals.push('Multiple inbound messages (engaged)'); sentimentBoost += 15; }
  if (inboundCount === 0 && outboundCount > 2) { riskFactors.push('No inbound responses despite outreach'); sentimentBoost -= 20; }
  if (daysSinceActivity <= 2) { positiveSignals.push('Recent activity (last 2 days)'); sentimentBoost += 10; }
  if (daysSinceActivity >= 14) { riskFactors.push(`No activity for ${daysSinceActivity} days`); sentimentBoost -= 15; }
  if (daysSinceActivity >= 30) { riskFactors.push('Deal likely stalled (30+ days silent)'); sentimentBoost -= 25; }

  // Check AI memory for signals
  if (contact) {
    const enrichment = (contact.enrichment_data || {}) as Record<string, unknown>;
    const memories = (enrichment.ai_memory || []) as Array<{ type: string; content: string }>;

    const hasObjection = memories.some(m => m.type === 'objection');
    const hasDecision = memories.some(m => m.type === 'decision');
    const hasInterest = memories.some(m => m.type === 'interest');

    if (hasObjection) { riskFactors.push('Unresolved objections noted'); sentimentBoost -= 10; }
    if (hasDecision) { positiveSignals.push('Decision/budget discussed'); sentimentBoost += 15; }
    if (hasInterest) { positiveSignals.push('Explicit interest expressed'); sentimentBoost += 10; }
  }

  // Calculate AI probability
  const aiProbability = Math.min(98, Math.max(2, stageProbability + sentimentBoost));

  // Reasoning
  const reasoning = positiveSignals.length > riskFactors.length
    ? `Deal shows strong signals: ${positiveSignals[0] || 'active engagement'}. AI raises probability above stage default.`
    : riskFactors.length > 0
    ? `Warning signs detected: ${riskFactors[0]}. AI lowers probability from stage default.`
    : 'Standard deal progression based on stage.';

  const contactName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Unknown';

  return {
    deal_id: deal.id as string,
    deal_name: deal.name as string,
    stage,
    value: Number(deal.value) || 0,
    stage_probability: stageProbability,
    ai_probability: aiProbability,
    confidence: totalActivities > 5 ? 0.8 : totalActivities > 2 ? 0.6 : 0.4,
    reasoning,
    predicted_close_date: deal.close_date as string | null,
    risk_factors: riskFactors,
    positive_signals: positiveSignals,
  };
}
