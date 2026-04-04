/**
 * SMS Campaign Engine
 *
 * Provides AI-powered SMS copy generation and bulk/scheduled sending
 * via the GHL API. Deducts credits for AI operations.
 *
 * Uses gpt-4o-mini for copy generation (1 credit per generation).
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { deductCredits, getAgencyCredits } from '@/lib/billing/credit-engine';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SMSCampaign {
  id: string;
  client_id: string;
  agency_id: string;
  name: string;
  message: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  contact_filter?: Record<string, unknown>;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SMSCampaignCreateParams {
  clientId: string;
  agencyId: string;
  name: string;
  message: string;
  contactIds?: string[];
  contactFilter?: Record<string, unknown>;
  scheduledAt?: string;
}

// ── Merge Tags ─────────────────────────────────────────────────────────────────

const MERGE_TAGS: Record<string, string> = {
  '{{first_name}}': 'Contact first name',
  '{{last_name}}': 'Contact last name',
  '{{full_name}}': 'Contact full name',
  '{{company}}': 'Company name',
  '{{phone}}': 'Contact phone',
  '{{email}}': 'Contact email',
};

export function getAvailableMergeTags(): Record<string, string> {
  return { ...MERGE_TAGS };
}

export function resolveMergeTags(
  message: string,
  contact: { first_name?: string; last_name?: string; email?: string; phone?: string; company_name?: string },
): string {
  let resolved = message;
  resolved = resolved.replace(/\{\{first_name\}\}/g, contact.first_name || 'there');
  resolved = resolved.replace(/\{\{last_name\}\}/g, contact.last_name || '');
  resolved = resolved.replace(/\{\{full_name\}\}/g, [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'there');
  resolved = resolved.replace(/\{\{company\}\}/g, contact.company_name || '');
  resolved = resolved.replace(/\{\{phone\}\}/g, contact.phone || '');
  resolved = resolved.replace(/\{\{email\}\}/g, contact.email || '');
  return resolved.trim();
}

// ── AI SMS Copy Generation ─────────────────────────────────────────────────────

export async function generateSMSCopy(
  description: string,
  businessName: string,
  agencyId: string,
): Promise<{ text: string; error?: string }> {
  // Check credits
  const credits = await getAgencyCredits(agencyId);
  if (credits.balance < 1) {
    return { text: '', error: 'Insufficient credits for AI SMS generation.' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert SMS marketing copywriter. Write concise, compelling SMS messages for businesses. Rules:
- Keep under 160 characters when possible (max 320)
- Include a clear CTA
- Sound human, not robotic
- Use merge tags like {{first_name}} where appropriate
- Never use markdown or formatting
- Comply with SMS marketing best practices (include opt-out note if promotional)`,
          },
          {
            role: 'user',
            content: `Write an SMS message for "${businessName}". Campaign description: ${description}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      return { text: '', error: `OpenAI API error: ${response.status}` };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    // Deduct 1 credit for AI generation
    await deductCredits(agencyId, 'chat.message' as any, { description: `SMS copy for: ${description.slice(0, 50)}` });

    return { text };
  } catch (err) {
    return { text: '', error: err instanceof Error ? err.message : 'Failed to generate SMS copy' };
  }
}

// ── Campaign CRUD ──────────────────────────────────────────────────────────────

export async function createSMSCampaign(params: SMSCampaignCreateParams): Promise<{ id: string | null; error?: string }> {
  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('sms_campaigns')
    .insert({
      client_id: params.clientId,
      agency_id: params.agencyId,
      name: params.name,
      message: params.message,
      status: params.scheduledAt ? 'scheduled' : 'draft',
      contact_filter: params.contactFilter || null,
      total_contacts: params.contactIds?.length || 0,
      sent_count: 0,
      failed_count: 0,
      scheduled_at: params.scheduledAt || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[sms-campaign] Create failed:', error.message);
    return { id: null, error: error.message };
  }

  // If specific contacts were provided, store them in a junction table
  if (params.contactIds?.length && data?.id) {
    const rows = params.contactIds.map(contactId => ({
      campaign_id: data.id,
      contact_id: contactId,
      status: 'pending',
    }));
    const insertResult = await supabase.from('sms_campaign_contacts').insert(rows); if (insertResult.error) console.warn('[sms-campaign] Insert contacts failed:', insertResult.error);
  }

  return { id: data?.id || null };
}

export async function listSMSCampaigns(
  clientId: string,
  limit = 20,
): Promise<SMSCampaign[]> {
  const supabase = createServiceClientWithoutCookies();

  const { data } = await supabase
    .from('sms_campaigns')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data as SMSCampaign[]) || [];
}

export async function deleteSMSCampaign(campaignId: string): Promise<boolean> {
  const supabase = createServiceClientWithoutCookies();
  const { error } = await supabase.from('sms_campaigns').delete().eq('id', campaignId);
  return !error;
}

// ── Bulk Send ──────────────────────────────────────────────────────────────────

export async function sendBulkSMS(
  clientId: string,
  agencyId: string,
  contacts: Array<{ id: string; phone: string; first_name?: string; last_name?: string }>,
  message: string,
): Promise<{ sent: number; failed: number }> {
  const supabase = createServiceClientWithoutCookies();

  // Get GHL token for sending
  const { getValidToken } = await import('@/lib/ghl/api');
  const token = await getValidToken(clientId).catch(() => null);
  if (!token) {
    return { sent: 0, failed: contacts.length };
  }

  // Get location ID
  const { data: clientData } = await supabase
    .from('agency_clients')
    .select('ghl_location_id')
    .eq('id', clientId)
    .single();

  const locationId = (clientData as Record<string, unknown>)?.ghl_location_id as string;
  if (!locationId) {
    return { sent: 0, failed: contacts.length };
  }

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    try {
      const resolvedMsg = resolveMergeTags(message, contact);

      const res = await fetch(`https://services.leadconnectorhq.com/conversations/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Version: '2021-04-15',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'SMS',
          contactId: contact.id,
          message: resolvedMsg,
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

// ── Scheduled Send ─────────────────────────────────────────────────────────────

export async function scheduleSMS(
  clientId: string,
  agencyId: string,
  contacts: Array<{ id: string; phone: string; first_name?: string; last_name?: string }>,
  message: string,
  sendAt: string,
): Promise<{ campaignId: string | null; error?: string }> {
  const result = await createSMSCampaign({
    clientId,
    agencyId,
    name: `Scheduled SMS — ${new Date(sendAt).toLocaleDateString()}`,
    message,
    contactIds: contacts.map(c => c.id),
    scheduledAt: sendAt,
  });

  return { campaignId: result.id, error: result.error };
}
