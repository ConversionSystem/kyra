// Allow up to 2 minutes for lead discovery
export const maxDuration = 120;

/**
 * POST /api/agency/pipeline/run
 * HUMAN-IN-THE-LOOP PIPELINE — Step 1 only.
 * 
 * Creates campaign → finds leads → STOPS.
 * Returns a stream of events so the UI shows real-time progress.
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
  const { name, target_industry, target_role, target_location, target_company_size,
    target_pain_points, value_prop, lead_count = 10 } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Campaign name required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

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

        const { data: campaign, error: campErr } = await svc.from('pipeline_campaigns').insert({
          agency_id: agencyId, name: name.trim(), target_industry, target_role,
          target_company_size, target_location, target_pain_points, value_prop,
          status: 'active', leads_found: 0, leads_messaged: 0, leads_replied: 0, leads_booked: 0,
        }).select().single();

        if (campErr || !campaign) {
          send('error', { step: 1, error: campErr?.message || 'Failed to create campaign' });
          controller.close(); return;
        }

        // Fire campaign.created webhook
        await logAndFire(agencyId, 'campaign.created', { id: campaign.id, name: campaign.name }, undefined, 'human');

        send('step', { step: 1, label: 'Campaign created', status: 'done', campaignId: campaign.id });

        // ═══ STEP 2: FIND LEADS ═══
        send('step', { step: 2, label: 'Finding real businesses...', status: 'running', total: lead_count });

        const searchPrompt = `Find exactly ${Math.min(lead_count * 2, 50)} real ${target_industry || 'businesses'} in ${target_location || 'the United States'}.
These must be REAL companies that exist on Google Maps, Yelp, Clutch, or industry directories.
Target: ${target_role || 'Owner/CEO'} at companies with ${target_company_size || '11-50'} employees.

Return JSON array: [{"company":"...","website":"...","industry":"...","location":"...","company_size":"..."}]
RULES:
- company: EXACT legal business name
- website: REAL domain (e.g. "sweetflower.com") — NO made-up domains
- Only include businesses you are confident actually exist
- NO LinkedIn URLs, NO people names (we discover those from websites)`;

        const searchRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o', temperature: 0.4, max_tokens: 4000,
            messages: [{ role: 'user', content: searchPrompt }],
            response_format: { type: 'json_object' },
          }),
        });
        const searchData = await searchRes.json();
        const rawText = searchData.choices?.[0]?.message?.content || '{}';
        let candidates: Array<Record<string, string>> = [];
        try {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed)) {
            candidates = parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            for (const val of Object.values(parsed)) {
              if (Array.isArray(val) && val.length > 0) {
                candidates = val as Array<Record<string, string>>;
                break;
              }
            }
          }
        } catch { candidates = []; }

        // Verify websites exist
        const verified: typeof candidates = [];
        for (const c of candidates) {
          if (!c.website) continue;
          const url = c.website.startsWith('http') ? c.website : `https://${c.website}`;
          try {
            const res = await fetch(url, {
              method: 'GET',
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KyraBot/1.0)' },
              signal: AbortSignal.timeout(5_000),
              redirect: 'follow',
            });
            if (res.ok || res.status === 403 || res.status === 405 || res.status === 406) {
              verified.push(c);
              send('lead_found', {
                step: 2, current: verified.length, total: lead_count,
                company: c.company, website: c.website, location: c.location,
              });
            }
          } catch {
            try {
              const res2 = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3_000), redirect: 'follow' });
              if (res2.ok || res2.status === 403) {
                verified.push(c);
                send('lead_found', {
                  step: 2, current: verified.length, total: lead_count,
                  company: c.company, website: c.website, location: c.location,
                });
              }
            } catch { /* truly unreachable */ }
          }
          if (verified.length >= lead_count) break;
        }

        // Insert leads into DB
        const leadsToInsert = verified.slice(0, lead_count).map(c => ({
          campaign_id: campaign.id, agency_id: agencyId,
          company: c.company, website: c.website, industry: c.industry || target_industry,
          location: c.location || target_location, company_size: c.company_size || target_company_size,
          full_name: `Owner at ${c.company}`, title: target_role || 'Owner',
          stage: 'found',
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
              email: null, phone: null, website: lead.website,
              industry: lead.industry, location: lead.location, stage: 'found',
            },
            'system',
          );
        }

        send('step', { step: 2, label: `Found ${dbLeads.length} verified businesses`, status: 'done', count: dbLeads.length });

        // ═══ STOP HERE — Human reviews leads next ═══
        send('step', { step: 3, label: 'Review leads below — approve the ones you want to research', status: 'waiting' });
        send('done', {
          campaignId: campaign.id,
          leadsFound: dbLeads.length,
          message: `Found ${dbLeads.length} verified businesses. Review them below and approve the ones you want to research.`,
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
