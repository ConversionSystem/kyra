/**
 * CRM AI Relationship Scoring
 *
 * Batch-scores contacts based on activity patterns, recency, engagement.
 * Runs as a cron job or manual trigger. 1 credit per batch of 50.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { deductCredits, getAgencyCredits, CREDIT_COSTS } from '@/lib/billing/credit-engine';
import { logActivity } from './activities';

const BATCH_SIZE = 50;
const SCORING_COST = CREDIT_COSTS?.crm_scoring ?? 1;

interface ScoringFactors {
  has_email: boolean;
  has_phone: boolean;
  has_company: boolean;
  activity_count: number;
  recent_activity_days: number | null;
  inbound_messages: number;
  outbound_messages: number;
  has_deal: boolean;
  deal_value: number;
  pipeline_stage: string;
  enriched: boolean;
}

export async function scoreContacts(agencyId: string): Promise<{ scored: number; skipped: number }> {
  const svc = createServiceClientWithoutCookies();

  // Get all contacts for this agency
  const { data: contacts } = await svc
    .from('crm_contacts')
    .select('id, email, phone, company_id, stage, enrichment_data, last_activity_at, score')
    .eq('agency_id', agencyId)
    .order('last_activity_at', { ascending: false, nullsFirst: false });

  if (!contacts?.length) return { scored: 0, skipped: 0 };

  // Check credits (1 per batch of 50)
  const batchesNeeded = Math.ceil(contacts.length / BATCH_SIZE);
  const totalCost = batchesNeeded * SCORING_COST;
  const creditBalance = await getAgencyCredits(agencyId);

  if (creditBalance.balance < totalCost) {
    console.log('[crm/scoring] Insufficient credits:', creditBalance.balance, 'need:', totalCost);
    return { scored: 0, skipped: contacts.length };
  }

  // Get activity counts per contact
  const contactIds = contacts.map(c => c.id);
  const { data: activityCounts } = await svc
    .from('crm_activities')
    .select('contact_id, type, direction')
    .eq('agency_id', agencyId)
    .in('contact_id', contactIds);

  const activityMap = new Map<string, { total: number; inbound: number; outbound: number }>();
  for (const act of (activityCounts || [])) {
    const entry = activityMap.get(act.contact_id) || { total: 0, inbound: 0, outbound: 0 };
    entry.total++;
    if (act.direction === 'inbound') entry.inbound++;
    if (act.direction === 'outbound') entry.outbound++;
    activityMap.set(act.contact_id, entry);
  }

  // Get deals per contact
  const { data: deals } = await svc
    .from('crm_deals')
    .select('contact_id, value, stage')
    .eq('agency_id', agencyId)
    .in('contact_id', contactIds);

  const dealMap = new Map<string, { has_deal: boolean; value: number }>();
  for (const deal of (deals || [])) {
    const existing = dealMap.get(deal.contact_id) || { has_deal: false, value: 0 };
    existing.has_deal = true;
    existing.value += Number(deal.value) || 0;
    dealMap.set(deal.contact_id, existing);
  }

  let scored = 0;
  const updates: Array<{ id: string; score: number; score_label: string }> = [];

  for (const contact of contacts) {
    const activities = activityMap.get(contact.id) || { total: 0, inbound: 0, outbound: 0 };
    const dealInfo = dealMap.get(contact.id) || { has_deal: false, value: 0 };
    const daysSinceActivity = contact.last_activity_at
      ? Math.floor((Date.now() - new Date(contact.last_activity_at).getTime()) / 86400000)
      : null;

    const factors: ScoringFactors = {
      has_email: !!contact.email,
      has_phone: !!contact.phone,
      has_company: !!contact.company_id,
      activity_count: activities.total,
      recent_activity_days: daysSinceActivity,
      inbound_messages: activities.inbound,
      outbound_messages: activities.outbound,
      has_deal: dealInfo.has_deal,
      deal_value: dealInfo.value,
      pipeline_stage: contact.stage,
      enriched: !!(contact.enrichment_data as Record<string, unknown>)?.ai_enriched,
    };

    const newScore = calculateScore(factors);
    const newLabel = newScore >= 70 ? 'hot' : newScore >= 40 ? 'warm' : newScore >= 10 ? 'cold' : 'new';

    // Only update if score changed significantly (±5 points)
    if (Math.abs(newScore - (contact.score || 0)) >= 5) {
      updates.push({ id: contact.id, score: newScore, score_label: newLabel });
      scored++;
    }
  }

  // Batch update
  for (const update of updates) {
    await svc
      .from('crm_contacts')
      .update({ score: update.score, score_label: update.score_label })
      .eq('id', update.id)
      .eq('agency_id', agencyId);
  }

  // Deduct credits
  if (scored > 0) {
    await deductCredits(agencyId, 'crm_scoring', {
      multiplier: batchesNeeded,
      description: `Scored ${scored} contacts`,
    });
  }

  return { scored, skipped: contacts.length - scored };
}

function calculateScore(f: ScoringFactors): number {
  let score = 0;

  // Contact completeness (0-15)
  if (f.has_email) score += 5;
  if (f.has_phone) score += 5;
  if (f.has_company) score += 3;
  if (f.enriched) score += 2;

  // Engagement (0-40)
  score += Math.min(15, f.inbound_messages * 5);  // Each inbound = 5pts, max 15
  score += Math.min(10, f.outbound_messages * 2);  // Each outbound = 2pts, max 10
  score += Math.min(15, f.activity_count * 2);      // Each activity = 2pts, max 15

  // Recency (0-25)
  if (f.recent_activity_days !== null) {
    if (f.recent_activity_days <= 1) score += 25;
    else if (f.recent_activity_days <= 3) score += 20;
    else if (f.recent_activity_days <= 7) score += 15;
    else if (f.recent_activity_days <= 14) score += 10;
    else if (f.recent_activity_days <= 30) score += 5;
    // > 30 days = 0
  }

  // Deal value (0-15)
  if (f.has_deal) {
    score += 5;
    if (f.deal_value >= 1000) score += 5;
    if (f.deal_value >= 5000) score += 5;
  }

  // Stage bonus (0-5)
  if (f.pipeline_stage === 'customer') score += 5;
  else if (f.pipeline_stage === 'contact') score += 3;

  return Math.min(100, Math.max(0, score));
}
