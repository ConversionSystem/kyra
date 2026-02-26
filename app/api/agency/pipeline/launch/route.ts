/**
 * POST /api/agency/pipeline/launch
 * Send outreach for approved leads via GHL — create contact + send email/SMS/both
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logAndFire } from '@/lib/pipeline/webhooks';
import { getGhlIntegration, syncLeadToCrm } from '@/lib/pipeline/crm-sync';

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';

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

  const { lead_ids, channel = 'both' } = await req.json();
  if (!lead_ids?.length) return NextResponse.json({ error: 'lead_ids required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();

  // Get GHL token from agency's native integration (or fall back to legacy client token)
  const ghlIntegration = await getGhlIntegration(agencyId);

  let token: string | null = null;
  let locationId: string | null = null;

  if (ghlIntegration?.access_token && ghlIntegration?.location_id) {
    // Use native pipeline integration (per-agency)
    token = ghlIntegration.access_token;
    locationId = ghlIntegration.location_id;
  } else {
    // Legacy fallback: look for any agency_client with a GHL token
    const { data: ghlClient } = await svc
      .from('agency_clients')
      .select('ghl_private_token, ghl_location_id')
      .eq('agency_id', agencyId)
      .not('ghl_private_token', 'is', null)
      .not('ghl_location_id', 'is', null)
      .limit(1)
      .single();

    token = (ghlClient?.ghl_private_token as string) || null;
    locationId = (ghlClient?.ghl_location_id as string) || null;
  }

  if (!token || !locationId) {
    return NextResponse.json({
      error: 'GHL not connected. Go to Pipeline → Integrations → Connect GoHighLevel to send outreach.',
    }, { status: 400 });
  }

  // Fetch leads — only approved or researched leads can be sent
  const { data: leads } = await svc
    .from('pipeline_leads')
    .select('*')
    .in('id', lead_ids)
    .eq('agency_id', agencyId);

  if (!leads?.length) return NextResponse.json({ error: 'No leads found' }, { status: 404 });

  const results: Array<{ id: string; name: string; status: 'sent' | 'error' | 'skipped'; channels: string[]; error?: string }> = [];

  for (const lead of leads) {
    // Skip already messaged or later stages
    if (['messaged', 'replied', 'interested', 'booked', 'closed'].includes(lead.stage)) {
      results.push({ id: lead.id, name: lead.full_name || lead.company || '?', status: 'skipped', channels: [] });
      continue;
    }

    // Must be outreach_approved (human reviewed the messages)
    // Also allow researched/approved for backward compatibility
    if (!['outreach_approved', 'researched', 'approved'].includes(lead.stage)) {
      results.push({ id: lead.id, name: lead.full_name || lead.company || '?', status: 'skipped', channels: [] });
      continue;
    }

    const sentChannels: string[] = [];

    try {
      // 1. Create or find GHL contact
      let contactId = lead.ghl_contact_id;
      if (!contactId) {
        const contactRes = await fetch(`${GHL_API}/contacts/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId,
            firstName: lead.first_name || '',
            lastName: lead.last_name || '',
            email: lead.email || '',
            phone: lead.phone || '',
            companyName: lead.company || '',
            source: 'Kyra AI Pipeline',
            tags: ['kyra-pipeline', `campaign-${(lead.campaign_id || '').slice(0, 8)}`],
          }),
          signal: AbortSignal.timeout(10_000),
        });
        const contactData = await contactRes.json().catch(() => ({}));
        contactId = contactData?.contact?.id || contactData?.id;

        if (!contactId) {
          results.push({ id: lead.id, name: lead.full_name || '?', status: 'error', channels: [], error: `GHL contact create failed: ${contactRes.status}` });
          continue;
        }
      }

      // 2. Add enrichment note
      const enrichment = (lead.enrichment_data || {}) as Record<string, string>;
      await fetch(`${GHL_API}/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: `🎯 Kyra Pipeline Lead\n\nCompany: ${enrichment.company_context || 'N/A'}\nPain Points: ${enrichment.likely_pain_points || 'N/A'}\nOpportunity: ${enrichment.opportunity_angle || 'N/A'}\nIcebreaker: ${enrichment.icebreaker || 'N/A'}`,
        }),
        signal: AbortSignal.timeout(8_000),
      }).catch(() => {});

      // 3. Send email if enabled and we have email + personalized content
      if ((channel === 'email' || channel === 'both') && lead.email && lead.personalized_email) {
        const emailHtml = `<p>${(lead.personalized_email as string).replace(/\n/g, '</p><p>')}</p>`;
        const emailRes = await fetch(`${GHL_API}/conversations/messages`, {
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
        if (emailRes.ok) sentChannels.push('email');
      }

      // 4. Send SMS if enabled and we have phone + opener
      if ((channel === 'sms' || channel === 'both') && lead.phone && lead.personalized_opener) {
        const smsRes = await fetch(`${GHL_API}/conversations/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'SMS',
            contactId,
            message: lead.personalized_opener,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (smsRes.ok) sentChannels.push('sms');
      }

      // 5. Update lead
      if (sentChannels.length > 0) {
        const previousStage = lead.stage;
        await svc.from('pipeline_leads').update({
          stage: 'messaged',
          messaged_at: new Date().toISOString(),
          ghl_contact_id: contactId,
          enrichment_data: {
            ...enrichment,
            sent_channels: sentChannels,
          },
        }).eq('id', lead.id);

        // Fire lead.messaged webhook
        await logAndFire(
          agencyId,
          'lead.messaged',
          { id: lead.campaign_id, name: 'Campaign' },
          {
            id: lead.id,
            full_name: lead.full_name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            industry: lead.industry,
            location: lead.location,
            stage: 'messaged',
            previous_stage: previousStage,
            personalized_subject: lead.personalized_subject,
            personalized_email: lead.personalized_email,
            personalized_opener: lead.personalized_opener,
            ghl_contact_id: contactId,
          },
          'human',
          { channels: sentChannels },
        );

        results.push({ id: lead.id, name: lead.full_name || '?', status: 'sent', channels: sentChannels });
      } else {
        results.push({ id: lead.id, name: lead.full_name || '?', status: 'error', channels: [], error: 'No channel available (missing email/phone or content)' });
      }
    } catch (err) {
      results.push({ id: lead.id, name: lead.full_name || '?', status: 'error', channels: [], error: err instanceof Error ? err.message : 'Unknown' });
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
