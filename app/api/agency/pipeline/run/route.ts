// Allow up to 2 minutes for lead discovery
export const maxDuration = 120;

/**
 * POST /api/agency/pipeline/run
 * HUMAN-IN-THE-LOOP PIPELINE — Step 1 only.
 *
 * Creates campaign → finds leads → STOPS.
 * Returns a stream of events so the UI shows real-time progress.
 *
 * Supports 3 lead sources:
 *   - google_maps: Real businesses from Outscraper/Google Maps (default)
 *   - ai_discovery: GPT-4o generated leads (legacy, may not be real)
 *   - csv_upload: Agency's own lead list
 *
 * After this, the human reviews leads in the UI and manually:
 * 1. Approves leads (found → approved)
 * 2. Triggers research (approved → researched)
 * 3. Reviews & approves outreach (researched → outreach_approved)
 * 4. Launches outreach (outreach_approved → messaged)
 * 5. AI Closer takes over autonomously for messaged leads
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logAndFire } from '@/lib/pipeline/webhooks';
import { findLeads, parseCsv, type LeadSourceType, type CsvLeadRow } from '@/lib/pipeline/lead-sources';
import { requireCredits, deductCredits } from '@/lib/billing/credit-engine';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

async function getAgencySettings(agencyId: string): Promise<Record<string, unknown>> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agencies').select('settings').eq('id', agencyId).single();
  return (data?.settings as Record<string, unknown>) || {};
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const {
    name, target_industry, target_role, target_location, target_company_size,
    target_pain_points, value_prop, lead_count = 10,
    // New fields for lead source
    lead_source = 'google_maps' as LeadSourceType,
    csv_data,       // raw CSV text (for csv_upload)
    enrich_model,   // optional LLM model override
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Campaign name required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();
  const settings = await getAgencySettings(agencyId);

  // Resolve API keys
  const openaiKey = process.env.OPENAI_API_KEY;
  const outscraperKey = (settings.outscraper_api_key as string) || process.env.OUTSCRAPER_API_KEY || '';
  const enrichModel = enrich_model || (settings.pipeline_model as string) || 'gpt-4o';

  if (!openaiKey && lead_source === 'ai_discovery') {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  // ── Pre-flight credit check ──────────────────────────────────────────────
  const creditCheck = await requireCredits(agencyId, 'pipeline.find_leads');
  if (!creditCheck.allowed) {
    return NextResponse.json({
      error: 'Insufficient credits',
      balance: creditCheck.balance,
      cost: creditCheck.cost,
      shortfall: creditCheck.shortfall,
      message: `This campaign requires ${creditCheck.cost} credits but you have ${creditCheck.balance}. Add credits to continue.`,
      buyUrl: '/agency/credits',
    }, { status: 402 });
  }

  // Parse CSV if provided
  let csvRows: CsvLeadRow[] | undefined;
  if (lead_source === 'csv_upload' && csv_data) {
    csvRows = parseCsv(csv_data);
    if (csvRows.length === 0) {
      return NextResponse.json({ error: 'CSV contains no valid rows. Ensure it has a header row with at least a "company" column.' }, { status: 400 });
    }
  }

  // ─── Stream response using SSE ─────────────────────────────────────────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // ═══ STEP 1: CREATE CAMPAIGN ═══
        send('step', { step: 1, label: 'Creating campaign...', status: 'running' });

        // Extract follow-up settings from request body
        const follow_up_count = body.follow_up_count ?? 3;
        const follow_up_delay_days = body.follow_up_delay_days ?? 3;
        const follow_up_channel = body.follow_up_channel ?? 'same';

        const { data: campaign, error: campErr } = await svc.from('pipeline_campaigns').insert({
          agency_id: agencyId, name: name.trim(), target_industry, target_role,
          target_company_size, target_location, target_pain_points, value_prop,
          status: 'active', leads_found: 0, leads_messaged: 0, leads_replied: 0, leads_booked: 0,
          follow_up_count, follow_up_delay_days, follow_up_channel,
        }).select().single();

        if (campErr || !campaign) {
          send('error', { step: 1, error: campErr?.message || 'Failed to create campaign' });
          controller.close(); return;
        }

        // Fire campaign.created webhook
        await logAndFire(agencyId, 'campaign.created', { id: campaign.id, name: campaign.name }, undefined, 'human');

        send('step', { step: 1, label: 'Campaign created', status: 'done', campaignId: campaign.id });

        // ═══ STEP 2: FIND LEADS ═══
        const sourceLabel = lead_source === 'google_maps'
          ? '🗺️ Searching Google Maps for real businesses...'
          : lead_source === 'csv_upload'
            ? '📄 Processing your lead list...'
            : '🤖 AI discovering businesses...';

        send('step', { step: 2, label: sourceLabel, status: 'running', total: lead_count, source: lead_source });

        // ── Use the unified lead source dispatcher ──
        const result = await findLeads(
          {
            type: lead_source as LeadSourceType,
            query: target_industry || 'businesses',
            location: target_location || 'United States',
            limit: lead_count,
            role: target_role,
            companySize: target_company_size,
            csvData: csvRows,
          },
          {
            outscraperKey,
            openaiKey: openaiKey || undefined,
            enrichModel,
          },
          send, // Stream callback — each lead shows in real-time
        );

        // Show warning if applicable
        if (result.warning) {
          send('step', { step: 2, label: result.warning, status: 'warning' });
        }

        if (result.leads.length === 0) {
          send('error', { step: 2, error: result.warning || 'No leads found. Try a different location or industry.' });
          controller.close(); return;
        }

        // ═══ DEDUCT CREDITS ═══
        await deductCredits(agencyId, 'pipeline.find_leads', {
          description: `Find leads: "${name}" (${result.leads.length} leads via ${result.source})`,
        });

        // ═══ STEP 3: INSERT LEADS INTO DB ═══
        const leadsToInsert = result.leads.map(lead => ({
          campaign_id: campaign.id,
          agency_id: agencyId,
          company: lead.company,
          website: lead.website,
          phone: lead.phone,
          email: lead.email,
          industry: lead.industry || target_industry,
          location: lead.location || target_location,
          company_size: lead.company_size || target_company_size,
          full_name: lead.email
            ? `Contact at ${lead.company}` // Will be discovered during enrich
            : `Owner at ${lead.company}`,
          title: target_role || 'Owner',
          stage: 'found',
          enrichment_data: {
            source: result.source,
            full_address: lead.full_address,
            rating: lead.rating,
            reviews_count: lead.reviews_count,
            description: lead.description,
            social_links: lead.social_links,
          },
        }));

        const { data: insertedLeads } = await svc.from('pipeline_leads').insert(leadsToInsert).select();
        const dbLeads = insertedLeads || [];

        await svc.from('pipeline_campaigns').update({ leads_found: dbLeads.length }).eq('id', campaign.id);

        // Fire lead.found webhook for each lead
        for (const lead of dbLeads) {
          await logAndFire(
            agencyId,
            'lead.found',
            { id: campaign.id, name: campaign.name },
            {
              id: lead.id, full_name: lead.full_name, company: lead.company,
              email: lead.email, phone: lead.phone, website: lead.website,
              industry: lead.industry, location: lead.location, stage: 'found',
            },
            'system',
          );
        }

        // ═══ DONE — Show results ═══
        const sourceDesc = result.source === 'google_maps'
          ? 'from Google Maps'
          : result.source === 'csv_upload'
            ? 'from your CSV'
            : 'via AI discovery';

        send('step', {
          step: 2,
          label: `Found ${dbLeads.length} businesses ${sourceDesc}`,
          status: 'done',
          count: dbLeads.length,
          source: result.source,
          cost: result.cost_estimate,
        });

        send('step', { step: 3, label: 'Review leads below — approve the ones you want to research', status: 'waiting' });
        send('done', {
          campaignId: campaign.id,
          leadsFound: dbLeads.length,
          source: result.source,
          message: `Found ${dbLeads.length} real businesses ${sourceDesc}. Review them below.`,
          nextAction: 'review_leads',
        });

      } catch (err) {
        send('error', { error: err instanceof Error ? err.message : 'Pipeline failed' });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
