/**
 * POST /api/agency/leads/run-campaign
 *
 * Channel 4: Outbound — Using Our Own Product
 *
 * Kyra's AI workers close Kyra's own sales.
 *
 * Flow:
 *   1. Create contact in GHL (CS AI worker's location)
 *   2. Send personalized initial outreach email via GHL API
 *   3. When the lead replies → GHL poll picks it up → CS AI worker (307c9548) handles it
 *   4. AI qualifies, pitches, includes booking link → Angel closes
 *
 * State stored in agencies.settings.campaign_state[leadId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];
const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';
// CS AI worker's GHL location — poll route monitors this for replies
const CS_GHL_LOCATION = 'y1BFVhXMDNUPlbPxEpSA';

interface LeadInput {
  id: string;
  owner: string;
  agency: string;
  niche: string;
  email?: string;
  linkedin?: string;
  warmth: string;
  angle: string;
  why: string;
  location: string;
  clients: string;
  ghlTier: string;
}

export interface CampaignRecord {
  status: 'sent' | 'no_email' | 'error' | 'replied' | 'interested' | 'booked' | 'closed';
  ghl_contact_id?: string;
  sent_at?: string;
  replied_at?: string;
  error?: string;
  lead_name: string;
  lead_company: string;
  lead_email?: string;
}

function buildSubject(lead: LeadInput): string {
  return `Quick question about your GHL agency`;
}

function buildEmailHtml(lead: LeadInput): string {
  const pitch = lead.angle;
  const firstName = lead.owner.split(' ')[0];

  return `<p>Hey ${firstName},</p>
<p>${pitch}</p>
<p>We built <strong>Kyra</strong> — a platform that deploys an autonomous AI worker to every GHL sub-account in your agency. One dashboard for all your clients. 5 minutes to set up.</p>
<p>Quick question: how many sub-accounts are you running right now?</p>
<p>— Kyra<br>
<em>AI Sales Agent · Conversion System</em><br>
<a href="https://kyra.conversionsystem.com/get-demo">Book a 15-min demo with Angel →</a></p>`;
}

function buildEmailText(lead: LeadInput): string {
  const firstName = lead.owner.split(' ')[0];
  return `Hey ${firstName},

${lead.angle}

We built Kyra — a platform that deploys an autonomous AI worker to every GHL sub-account in your agency. One dashboard for all your clients. 5 minutes to set up.

Quick question: how many sub-accounts are you running right now?

— Kyra
AI Sales Agent · Conversion System
Book a 15-min demo with Angel: https://kyra.conversionsystem.com/get-demo`;
}

async function createGhlContact(
  token: string,
  lead: LeadInput,
): Promise<string | null> {
  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId: CS_GHL_LOCATION,
        firstName: lead.owner.split(' ')[0],
        lastName: lead.owner.split(' ').slice(1).join(' '),
        companyName: lead.agency,
        email: lead.email || '',
        source: 'Kyra Outbound Campaign',
        tags: ['kyra-outreach', `warmth-${lead.warmth}`, `niche-${lead.niche.toLowerCase().replace(/\s+/g, '-')}`],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = await res.json().catch(() => ({}));
    return (data?.contact?.id || data?.id) ?? null;
  } catch {
    return null;
  }
}

async function sendGhlEmail(
  token: string,
  contactId: string,
  lead: LeadInput,
): Promise<{ ok: boolean; conversationId?: string; error?: string }> {
  try {
    // Try to send email via GHL conversations API
    const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'Email',
        contactId,
        subject: buildSubject(lead),
        html: buildEmailHtml(lead),
        message: buildEmailText(lead),
        locationId: CS_GHL_LOCATION,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return { ok: true, conversationId: data?.conversationId || data?.id };
    }

    return {
      ok: false,
      error: `GHL ${res.status}: ${JSON.stringify(data).slice(0, 200)}`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leads } = body as { leads: LeadInput[] };

    if (!leads?.length) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
    }

    // Get CS agency token for the outreach GHL location
    const serviceClient = createServiceClientWithoutCookies();
    const { data: ghlClient } = await serviceClient
      .from('agency_clients')
      .select('ghl_private_token, ghl_location_id')
      .eq('id', '307c9548-2782-4c12-8122-0f0d132bd4dd')
      .single();

    if (!ghlClient?.ghl_private_token) {
      return NextResponse.json({
        error: 'CS AI worker GHL token not found',
      }, { status: 500 });
    }

    const token = ghlClient.ghl_private_token as string;

    // Get existing campaign state
    const { data: agency } = await serviceClient
      .from('agencies')
      .select('id, settings')
      .eq('id', (await serviceClient
        .from('agency_members')
        .select('agency_id')
        .eq('user_id', user.id)
        .single()
        .then(r => r.data?.agency_id || '')))
      .single();

    const settings = (agency?.settings ?? {}) as Record<string, unknown>;
    const campaignState = (settings.campaign_state ?? {}) as Record<string, CampaignRecord>;

    const results: Array<{
      id: string;
      leadName: string;
      status: CampaignRecord['status'];
      error?: string;
    }> = [];

    // Process in batches of 3 (GHL rate limits)
    for (let i = 0; i < leads.length; i += 3) {
      const batch = leads.slice(i, i + 3);

      const batchResults = await Promise.all(
        batch.map(async (lead) => {
          // Skip already sent
          if (campaignState[lead.id]?.status === 'sent' ||
              campaignState[lead.id]?.status === 'replied' ||
              campaignState[lead.id]?.status === 'booked') {
            return { id: lead.id, leadName: lead.owner, status: campaignState[lead.id].status };
          }

          // Step 1: Create GHL contact
          const contactId = await createGhlContact(token, lead);

          if (!contactId) {
            const record: CampaignRecord = {
              status: 'error',
              error: 'Failed to create GHL contact',
              lead_name: lead.owner,
              lead_company: lead.agency,
              lead_email: lead.email,
            };
            campaignState[lead.id] = record;
            return { id: lead.id, leadName: lead.owner, status: 'error' as const, error: record.error };
          }

          // Step 2: Send email (only if they have an email address)
          if (!lead.email) {
            const record: CampaignRecord = {
              status: 'no_email',
              ghl_contact_id: contactId,
              lead_name: lead.owner,
              lead_company: lead.agency,
            };
            campaignState[lead.id] = record;
            return { id: lead.id, leadName: lead.owner, status: 'no_email' as const };
          }

          const emailResult = await sendGhlEmail(token, contactId, lead);

          const record: CampaignRecord = {
            status: emailResult.ok ? 'sent' : 'error',
            ghl_contact_id: contactId,
            sent_at: emailResult.ok ? new Date().toISOString() : undefined,
            error: emailResult.error,
            lead_name: lead.owner,
            lead_company: lead.agency,
            lead_email: lead.email,
          };
          campaignState[lead.id] = record;

          return {
            id: lead.id,
            leadName: lead.owner,
            status: record.status,
            error: record.error,
          };
        }),
      );

      results.push(...batchResults);

      // Rate limit pause between batches
      if (i + 3 < leads.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Persist updated campaign state
    if (agency?.id) {
      await serviceClient
        .from('agencies')
        .update({
          settings: { ...settings, campaign_state: campaignState },
          updated_at: new Date().toISOString(),
        })
        .eq('id', agency.id);
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const noEmail = results.filter(r => r.status === 'no_email').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      status: 'done',
      sent,
      no_email: noEmail,
      errors,
      results,
      message: `${sent} outreach emails sent${noEmail > 0 ? `, ${noEmail} skipped (no email)` : ''}${errors > 0 ? `, ${errors} errors` : ''}. CS AI worker (Kyra) will handle all replies automatically.`,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[leads/run-campaign] error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
