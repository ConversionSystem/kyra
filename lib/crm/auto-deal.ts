/**
 * Auto-Deal Creation from Conversation Signals
 *
 * Analyzes conversation history for a contact and auto-creates a deal
 * when positive signals are detected (3+ positive replies, pricing discussion, etc.)
 *
 * Called from the CRM autopilot cron.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { createDeal } from './deals';
import { logActivity } from './activities';

interface ConversationSignal {
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  positive_replies: number;
  pricing_mentioned: boolean;
  meeting_mentioned: boolean;
  total_inbound: number;
  latest_message: string;
}

const POSITIVE_KEYWORDS = [
  'yes', 'sure', 'sounds good', 'interested', 'let\'s', "let's do it",
  'how much', 'pricing', 'cost', 'budget', 'sign up', 'get started',
  'schedule', 'meet', 'call', 'demo', 'trial', 'love to', 'would love',
  'definitely', 'absolutely', 'perfect', 'great', 'awesome', 'amazing',
  'when can', 'how do i', 'send me', 'i want', 'i need',
];

const PRICING_KEYWORDS = [
  'price', 'pricing', 'cost', 'how much', 'budget', 'quote', 'proposal',
  'rate', 'per month', 'monthly', 'annual', 'discount', 'plan',
];

const MEETING_KEYWORDS = [
  'meet', 'meeting', 'call', 'schedule', 'calendar', 'available',
  'thursday', 'monday', 'tuesday', 'wednesday', 'friday',
  'next week', 'this week', 'tomorrow', 'today',
  'zoom', 'google meet', 'teams',
];

function countPositiveSignals(messages: string[]): { positive: number; pricing: boolean; meeting: boolean } {
  let positive = 0;
  let pricing = false;
  let meeting = false;

  for (const msg of messages) {
    const lower = msg.toLowerCase();
    if (POSITIVE_KEYWORDS.some((kw) => lower.includes(kw))) positive++;
    if (PRICING_KEYWORDS.some((kw) => lower.includes(kw))) pricing = true;
    if (MEETING_KEYWORDS.some((kw) => lower.includes(kw))) meeting = true;
  }

  return { positive, pricing, meeting };
}

/**
 * Scan contacts without deals for auto-deal creation signals.
 * Creates deals when 3+ positive signals detected.
 */
export async function scanForAutoDeals(agencyId: string): Promise<{ scanned: number; created: number }> {
  const svc = createServiceClientWithoutCookies();

  // Get contacts without deals that have recent inbound activity
  const { data: contacts } = await svc
    .from('crm_contacts')
    .select('id, first_name, last_name, email, phone, company_id')
    .eq('agency_id', agencyId)
    .in('stage', ['lead', 'contact'])
    .not('last_activity_at', 'is', null)
    .order('last_activity_at', { ascending: false })
    .limit(100);

  if (!contacts?.length) return { scanned: 0, created: 0 };

  let created = 0;

  for (const contact of contacts) {
    // Check if contact already has an open deal
    const { count: existingDeals } = await svc
      .from('crm_deals')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('contact_id', contact.id)
      .not('stage', 'in', '("won","lost")');

    if (existingDeals && existingDeals > 0) continue;

    // Get inbound messages for this contact
    const { data: activities } = await svc
      .from('crm_activities')
      .select('body, direction')
      .eq('contact_id', contact.id)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!activities?.length || activities.length < 2) continue;

    const inboundMessages = activities.map((a) => a.body || '').filter(Boolean);
    const signals = countPositiveSignals(inboundMessages);

    // Auto-create deal if 3+ positive signals OR pricing + meeting mentioned
    if (signals.positive >= 3 || (signals.pricing && signals.meeting)) {
      const contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';

      // Get company name
      let companyName = '';
      if (contact.company_id) {
        const { data: company } = await svc
          .from('crm_companies')
          .select('name')
          .eq('id', contact.company_id)
          .single();
        companyName = company?.name || '';
      }

      const dealName = companyName
        ? `${companyName} — ${contactName}`
        : `Deal: ${contactName}`;

      const deal = await createDeal(agencyId, {
        name: dealName,
        contact_id: contact.id,
        company_id: contact.company_id || undefined,
        stage: signals.pricing ? 'qualified' : 'prospect',
        probability: signals.meeting ? 40 : 20,
        source: 'ai_auto',
        notes: `Auto-created by AI: ${signals.positive} positive signals, ${signals.pricing ? 'pricing discussed' : 'no pricing yet'}, ${signals.meeting ? 'meeting mentioned' : 'no meeting yet'}`,
      });

      if (deal) {
        created++;

        // Update contact stage
        await svc
          .from('crm_contacts')
          .update({ stage: 'contact' })
          .eq('id', contact.id)
          .eq('agency_id', agencyId);

        // Log activity
        await logActivity(agencyId, {
          contact_id: contact.id,
          deal_id: deal.id,
          type: 'deal_created',
          subject: `AI auto-created deal: ${dealName}`,
          body: `Detected ${signals.positive} positive conversation signals. ${signals.pricing ? 'Pricing was discussed. ' : ''}${signals.meeting ? 'Meeting was mentioned.' : ''}`,
          actor: 'ai',
          actor_name: 'Auto-Deal Engine',
          needs_attention: true,
          attention_type: 'review',
        });
      }
    }
  }

  return { scanned: contacts.length, created };
}
