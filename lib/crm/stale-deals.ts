/**
 * CRM Stale Deal Detection + Auto Follow-Up Drafts
 *
 * Finds deals that haven't had activity in X days and:
 * 1. Creates attention items in command feed
 * 2. Drafts AI follow-up messages (1 credit each)
 * 3. Creates tasks for the agency owner
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logActivity } from './activities';
import { deductCredits, getAgencyCredits, CREDIT_COSTS } from '@/lib/billing/credit-engine';

const STALE_DAYS = 7;
const FOLLOW_UP_COST = CREDIT_COSTS?.crm_follow_up_draft ?? 1;

export async function detectStaleDeals(agencyId: string): Promise<{ stale: number; drafted: number }> {
  const svc = createServiceClientWithoutCookies();
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 86400000).toISOString();

  // Find active deals with no recent activity
  const { data: deals } = await svc
    .from('crm_deals')
    .select('*, crm_contacts!crm_deals_contact_id_fkey(id, first_name, last_name, email, phone)')
    .eq('agency_id', agencyId)
    .in('stage', ['prospect', 'qualified', 'proposal', 'negotiation'])
    .lt('updated_at', staleCutoff);

  if (!deals?.length) return { stale: 0, drafted: 0 };

  // Check which deals already have a recent "stale" activity (avoid spam)
  const dealIds = deals.map(d => d.id);
  const { data: recentStaleAlerts } = await svc
    .from('crm_activities')
    .select('deal_id')
    .eq('agency_id', agencyId)
    .eq('attention_type', 'stale_deal')
    .eq('resolved', false)
    .in('deal_id', dealIds);

  const alreadyAlerted = new Set((recentStaleAlerts || []).map(a => a.deal_id));
  const newStale = deals.filter(d => !alreadyAlerted.has(d.id));

  if (!newStale.length) return { stale: deals.length, drafted: 0 };

  const creditBalance = await getAgencyCredits(agencyId);
  let drafted = 0;

  for (const deal of newStale) {
    const contact = (deal as Record<string, unknown>).crm_contacts as Record<string, unknown> | null;
    const contactName = contact
      ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
      : 'Unknown';

    const daysSinceUpdate = Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / 86400000);

    // Create attention item
    await logActivity(agencyId, {
      contact_id: contact?.id as string || undefined,
      deal_id: deal.id,
      type: 'system',
      subject: `Deal stale: "${deal.name}" — ${daysSinceUpdate} days`,
      body: `$${Number(deal.value).toLocaleString()} deal with ${contactName} has had no activity for ${daysSinceUpdate} days. Consider following up.`,
      actor: 'ai',
      actor_name: 'Deal Monitor',
      needs_attention: true,
      attention_type: 'stale_deal',
      metadata: {
        deal_id: deal.id,
        deal_value: deal.value,
        days_stale: daysSinceUpdate,
      },
    });

    // Draft follow-up if we have credits
    if (creditBalance.balance >= FOLLOW_UP_COST && contact?.email) {
      const draft = await draftFollowUp(deal, contact);
      if (draft) {
        await svc.from('crm_tasks').insert({
          agency_id: agencyId,
          contact_id: contact.id as string,
          deal_id: deal.id,
          title: `Follow up on "${deal.name}"`,
          description: `AI-drafted follow-up for stale deal (${daysSinceUpdate} days).`,
          type: 'follow_up',
          priority: daysSinceUpdate > 14 ? 'high' : 'medium',
          status: 'pending',
          due_date: new Date(Date.now() + 86400000).toISOString(),
          assigned_to: 'ai',
          created_by: 'ai',
          ai_draft: draft,
        });

        await deductCredits(agencyId, 'crm_follow_up_draft', {
          description: `Follow-up draft for ${contactName} — ${deal.name}`,
        });
        drafted++;
      }
    }
  }

  return { stale: deals.length, drafted };
}

async function draftFollowUp(
  deal: Record<string, unknown>,
  contact: Record<string, unknown>,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You write short, warm follow-up messages for sales conversations. Keep it under 50 words. Be specific to the deal context. No subject line needed.',
          },
          {
            role: 'user',
            content: `Draft a follow-up message for:
Contact: ${contact.first_name || ''} ${contact.last_name || ''}
Deal: ${deal.name} ($${Number(deal.value).toLocaleString()})
Stage: ${deal.stage}
Notes: ${deal.notes || 'None'}
Days since last contact: ${Math.floor((Date.now() - new Date(deal.updated_at as string).getTime()) / 86400000)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}
