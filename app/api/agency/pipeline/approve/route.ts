/**
 * POST /api/agency/pipeline/approve
 * Batch approve/reject leads at various pipeline stages.
 * 
 * Actions:
 * - approve:            found → approved (ready for research)
 * - reject:             any → skipped
 * - approve_outreach:   researched → outreach_approved (ready to send)
 * 
 * Fires webhooks for each transition.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logAndFire, type PipelineEvent } from '@/lib/pipeline/webhooks';
import { syncLeadToCrm } from '@/lib/pipeline/crm-sync';
import { syncPipelineLeadToCrm } from '@/lib/crm/pipeline-sync';
import { updateTestStats } from '@/lib/pipeline/ab-testing';

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

  const body = await req.json();
  const { lead_ids, action } = body;

  if (!lead_ids?.length) return NextResponse.json({ error: 'lead_ids required' }, { status: 400 });
  if (!['approve', 'reject', 'approve_outreach'].includes(action)) {
    return NextResponse.json({ error: 'action must be: approve, reject, or approve_outreach' }, { status: 400 });
  }

  const svc = createServiceClientWithoutCookies();

  // Fetch leads
  const { data: leads } = await svc
    .from('pipeline_leads')
    .select('*, pipeline_campaigns!inner(id, name)')
    .in('id', lead_ids)
    .eq('agency_id', agencyId);

  if (!leads?.length) return NextResponse.json({ error: 'No leads found' }, { status: 404 });

  const results: Array<{ id: string; name: string; status: 'updated' | 'skipped' | 'error'; error?: string }> = [];

  for (const lead of leads) {
    const campaign = (lead as Record<string, unknown>).pipeline_campaigns as { id: string; name: string };
    const previousStage = lead.stage;

    try {
      let newStage: string;
      let webhookEvent: PipelineEvent;

      switch (action) {
        case 'approve':
          // Only found leads can be approved
          if (lead.stage !== 'found') {
            results.push({ id: lead.id, name: lead.full_name || lead.company || '?', status: 'skipped', error: `Cannot approve: lead is in "${lead.stage}" stage (expected "found")` });
            continue;
          }
          newStage = 'approved';
          webhookEvent = 'lead.approved';
          break;

        case 'approve_outreach':
          // Only researched leads can have outreach approved
          if (lead.stage !== 'researched') {
            results.push({ id: lead.id, name: lead.full_name || lead.company || '?', status: 'skipped', error: `Cannot approve outreach: lead is in "${lead.stage}" stage (expected "researched")` });
            continue;
          }
          newStage = 'outreach_approved';
          webhookEvent = 'lead.outreach_approved';
          break;

        case 'reject':
          // Can reject from any pre-messaged stage
          if (['messaged', 'replied', 'interested', 'booked', 'closed'].includes(lead.stage)) {
            results.push({ id: lead.id, name: lead.full_name || lead.company || '?', status: 'skipped', error: `Cannot reject: lead is already in "${lead.stage}" stage` });
            continue;
          }
          newStage = 'skipped';
          webhookEvent = 'lead.skipped';
          break;

        default:
          continue;
      }

      // Update lead stage
      const { error: updateErr } = await svc
        .from('pipeline_leads')
        .update({ stage: newStage })
        .eq('id', lead.id);

      if (updateErr) {
        results.push({ id: lead.id, name: lead.full_name || lead.company || '?', status: 'error', error: updateErr.message });
        continue;
      }

      // Fire webhook + log activity
      const leadPayload = {
        id: lead.id,
        full_name: lead.full_name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        industry: lead.industry,
        location: lead.location,
        stage: newStage,
        previous_stage: previousStage,
        personalized_subject: lead.personalized_subject,
        personalized_email: lead.personalized_email,
        personalized_opener: lead.personalized_opener,
        ghl_contact_id: lead.ghl_contact_id,
      };

      await logAndFire(agencyId, webhookEvent, { id: campaign.id, name: campaign.name }, leadPayload, 'human');

      // Sync to GHL CRM (non-blocking)
      syncLeadToCrm(agencyId, {
        ...leadPayload,
        first_name: lead.first_name,
        last_name: lead.last_name,
        title: lead.title,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        enrichment_data: lead.enrichment_data,
      }).catch(err => console.error('[approve] GHL CRM sync error:', err));

      // Update A/B test stats (non-blocking)
      updateTestStats(lead.id, newStage).catch(() => {});

      // Sync to native CRM (non-blocking)
      syncPipelineLeadToCrm(agencyId, {
        id: lead.id,
        agency_id: agencyId,
        campaign_id: campaign.id,
        full_name: lead.full_name,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        title: lead.title,
        website: lead.website,
        industry: lead.industry,
        location: lead.location,
        stage: newStage,
        enrichment_data: lead.enrichment_data,
      }).catch(err => console.error('[approve] Native CRM sync error:', err));

      results.push({ id: lead.id, name: lead.full_name || lead.company || '?', status: 'updated' });
    } catch (err) {
      results.push({ id: lead.id, name: lead.full_name || lead.company || '?', status: 'error', error: err instanceof Error ? err.message : 'Unknown' });
    }
  }

  return NextResponse.json({
    updated: results.filter(r => r.status === 'updated').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  });
}
