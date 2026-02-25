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
// Match version used by the working poll route
const GHL_VERSION = '2021-04-15';
// Token 2: CS demo account — 10 contacts, used for outbound AI outreach
// Replies are handled by the CS AI worker connected to this location
const OUTREACH_LOCATION_ID = 'y1BFVhXMDNUPlbPxEpSA';

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
<a href="https://kyra.conversionsystem.com/get-demo">Request a quick demo →</a></p>`;
}

function buildEmailText(lead: LeadInput): string {
  const firstName = lead.owner.split(' ')[0];
  return `Hey ${firstName},

${lead.angle}

We built Kyra — a platform that deploys an autonomous AI worker to every GHL sub-account in your agency. One dashboard for all your clients. 5 minutes to set up.

Quick question: how many sub-accounts are you running right now?

— Kyra
AI Sales Agent · Conversion System
Request a quick demo: https://kyra.conversionsystem.com/get-demo`;
}

async function createGhlContact(
  token: string,
  locationId: string,
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
        locationId,
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
  locationId: string,
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
        // locationId NOT included — GHL infers it from the Bearer token
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

    // Get Token 2 (CS demo / outreach account) — query by location ID, not by UUID
    // This is the account replies flow back into for the CS AI worker to handle
    const serviceClient = createServiceClientWithoutCookies();
    const { data: ghlClient, error: ghlClientError } = await serviceClient
      .from('agency_clients')
      .select('id, name, ghl_private_token, ghl_location_id')
      .eq('ghl_location_id', OUTREACH_LOCATION_ID)
      .not('ghl_private_token', 'is', null)
      .limit(1)
      .single();

    if (ghlClientError || !ghlClient) {
      console.error('[run-campaign] Token 2 client not found:', ghlClientError?.message);
      return NextResponse.json({
        error: `Outreach GHL client not found for location ${OUTREACH_LOCATION_ID}. Connect Token 2 in the dashboard first.`,
        location_id: OUTREACH_LOCATION_ID,
      }, { status: 500 });
    }

    if (!ghlClient.ghl_private_token) {
      return NextResponse.json({
        error: 'Token 2 GHL private token not set. Connect GHL on the CS demo client first.',
        client_id: ghlClient.id,
        client_name: ghlClient.name,
      }, { status: 500 });
    }

    const token = ghlClient.ghl_private_token as string;
    const locationId = OUTREACH_LOCATION_ID;

    // Get existing campaign state — two-step lookup to avoid nested await fragility
    const { data: membership } = await serviceClient
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    const agencyId = membership?.agency_id;
    const { data: agency } = agencyId
      ? await serviceClient.from('agencies').select('id, settings').eq('id', agencyId).single()
      : { data: null };

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
          const contactId = await createGhlContact(token, locationId, lead);

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

          const emailResult = await sendGhlEmail(token, locationId, contactId, lead);

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
