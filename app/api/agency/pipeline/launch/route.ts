/**
 * POST /api/agency/pipeline/launch
 * Send outreach for researched leads via GHL — create contact + send email
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';
const OUTREACH_LOCATION_ID = 'y1BFVhXMDNUPlbPxEpSA';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { lead_ids } = await req.json();
  if (!lead_ids?.length) return NextResponse.json({ error: 'lead_ids required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();

  // Get GHL token from Token 2 (outreach location)
  const { data: ghlClient } = await svc
    .from('agency_clients')
    .select('ghl_private_token, ghl_location_id')
    .eq('ghl_location_id', OUTREACH_LOCATION_ID)
    .not('ghl_private_token', 'is', null)
    .limit(1)
    .single();

  if (!ghlClient?.ghl_private_token) {
    return NextResponse.json({ error: 'GHL Token 2 not found. Connect GHL in the dashboard first.' }, { status: 500 });
  }

  const token = ghlClient.ghl_private_token as string;
  const locationId = OUTREACH_LOCATION_ID;

  // Fetch leads
  const { data: leads } = await svc
    .from('pipeline_leads')
    .select('*')
    .in('id', lead_ids)
    .eq('agency_id', agencyId);

  if (!leads?.length) return NextResponse.json({ error: 'No leads found' }, { status: 404 });

  const results: Array<{ id: string; status: 'sent' | 'error' | 'skipped'; error?: string }> = [];

  for (const lead of leads) {
    // Skip already messaged
    if (['messaged', 'replied', 'interested', 'booked', 'closed'].includes(lead.stage)) {
      results.push({ id: lead.id, status: 'skipped' });
      continue;
    }

    try {
      // 1. Create GHL contact
      const contactRes = await fetch(`${GHL_API}/contacts/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          firstName: lead.first_name,
          lastName: lead.last_name,
          email: lead.email || '',
          companyName: lead.company || '',
          source: 'Kyra AI Pipeline',
          tags: ['kyra-pipeline', `campaign-${lead.campaign_id.slice(0, 8)}`],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const contactData = await contactRes.json().catch(() => ({}));
      const contactId = contactData?.contact?.id || contactData?.id;

      if (!contactId) {
        results.push({ id: lead.id, status: 'error', error: `GHL contact create failed: ${contactRes.status}` });
        continue;
      }

      // 2. Add note with enrichment data
      const enrichment = (lead.enrichment_data || {}) as Record<string, string>;
      await fetch(`${GHL_API}/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: `🎯 Kyra Pipeline Lead\n\nCompany: ${enrichment.company_context || 'N/A'}\nPain Points: ${enrichment.likely_pain_points || 'N/A'}\nOpportunity: ${enrichment.opportunity_angle || 'N/A'}\nIcebreaker: ${enrichment.icebreaker || 'N/A'}`,
        }),
        signal: AbortSignal.timeout(8_000),
      }).catch(() => {});

      // 3. Send email if we have email + personalized content
      if (lead.email && lead.personalized_email) {
        const emailHtml = `<p>${(lead.personalized_email as string).replace(/\n/g, '</p><p>')}</p>`;
        await fetch(`${GHL_API}/conversations/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'Email',
            contactId,
            subject: lead.personalized_subject || 'Quick question',
            html: emailHtml,
            message: lead.personalized_email,
          }),
          signal: AbortSignal.timeout(10_000),
        });
      }

      // 4. Update lead
      await svc.from('pipeline_leads').update({
        stage: 'messaged',
        messaged_at: new Date().toISOString(),
        ghl_contact_id: contactId,
      }).eq('id', lead.id);

      results.push({ id: lead.id, status: 'sent' });
    } catch (err) {
      results.push({ id: lead.id, status: 'error', error: err instanceof Error ? err.message : 'Unknown' });
    }

    // Rate limit pause
    await new Promise(r => setTimeout(r, 500));
  }

  // Update campaign counter
  const sent = results.filter(r => r.status === 'sent').length;
  if (sent > 0 && leads[0]?.campaign_id) {
    const { data: camp } = await svc.from('pipeline_campaigns').select('leads_messaged').eq('id', leads[0].campaign_id).single();
    await svc.from('pipeline_campaigns').update({
      leads_messaged: (camp?.leads_messaged ?? 0) + sent,
    }).eq('id', leads[0].campaign_id);
  }

  return NextResponse.json({
    sent,
    errors: results.filter(r => r.status === 'error').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    results,
  });
}
