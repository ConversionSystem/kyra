/**
 * POST /api/agency/pipeline/search
 * AI-powered lead search — finds REAL, verified companies matching criteria.
 * 
 * Two-stage approach:
 * 1. GPT-4o identifies real companies in the target market (low temperature for accuracy)
 * 2. Website verification — HEAD request to confirm each company actually exists
 * 
 * Leads with unverifiable websites are dropped. Over-generates by 2x to account for failures.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

/**
 * Verify a website actually exists via HEAD request.
 * Returns { ok: true, resolvedUrl } or { ok: false }.
 */
async function verifyWebsite(url: string): Promise<{ ok: boolean; resolvedUrl?: string }> {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(fullUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(6_000),
      redirect: 'follow',
    });
    // 200, 301, 302, 403, 405 all mean the site exists
    if (res.ok || [301, 302, 403, 405].includes(res.status)) {
      return { ok: true, resolvedUrl: res.url || fullUrl };
    }
    return { ok: false };
  } catch {
    // Some sites block HEAD — try a lightweight GET
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const res = await fetch(fullUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(6_000),
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      });
      if (res.ok || res.status === 403) {
        return { ok: true, resolvedUrl: res.url || fullUrl };
      }
    } catch {
      // Truly unreachable
    }
    return { ok: false };
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { campaign_id, criteria } = await req.json();
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();

  // Verify campaign belongs to agency
  const { data: campaign } = await svc
    .from('pipeline_campaigns')
    .select('*')
    .eq('id', campaign_id)
    .eq('agency_id', agencyId)
    .single();
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const count = criteria?.count ?? 25;
  const industry = criteria?.industry || campaign.target_industry || 'digital marketing agencies';
  const role = criteria?.role || campaign.target_role || 'CEO, Founder, Owner';
  const companySize = criteria?.company_size || campaign.target_company_size || '5-50';
  const location = criteria?.location || campaign.target_location || 'United States';
  const painPoints = criteria?.pain_points || campaign.target_pain_points || '';

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

  // Stage 1: GPT-4o identifies REAL companies
  // Over-generate by 2.5x to account for verification failures
  const generateCount = Math.min(Math.ceil(count * 2.5), 100);

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: `You are an expert B2B lead researcher. Your job is to identify REAL companies that exist right now.

CRITICAL RULES — READ CAREFULLY:
1. Every company MUST be a REAL business that actually exists with a working website.
2. Use your training knowledge of real companies. Think about companies you've seen mentioned in articles, directories, case studies, etc.
3. The website field MUST be the company's actual domain (e.g., smartmarketer.com, cardinaldigital.com). NOT made-up domains.
4. For decision-makers: Name REAL people if you know them (from conferences, podcasts, LinkedIn, articles). If you don't know a real person at the company, set first_name and last_name to empty strings "" and put the likely title.
5. LinkedIn URLs: ONLY include if you're 90%+ confident it's the real URL. Otherwise set to "".
6. DO NOT use placeholder domains like "company-name.com" or "firstnamelastname.com". Use the real domain.
7. Think of companies you've actually encountered in your training data — real agencies, real SaaS companies, real businesses.

For digital marketing agencies specifically, think about:
- Agencies listed in GHL/HighLevel community
- Agencies featured on Clutch.co, DesignRush, Agency Analytics directories  
- Agencies with active social media / podcast presence
- Agencies that speak at marketing conferences
- Local agencies in the specified region

Generate exactly ${generateCount} leads.

Target:
- Industry: ${industry}
- Decision-maker roles: ${role}
- Company size: ${companySize} employees
- Location: ${location}
${painPoints ? `- Their likely challenges: ${painPoints}` : ''}

Return JSON: { "leads": [
  {
    "first_name": "real name or empty string",
    "last_name": "real name or empty string",
    "title": "their actual role",
    "company": "REAL company name",
    "industry": "specific sub-industry",
    "company_size": "estimated headcount",
    "location": "city, state/country",
    "website": "their-real-domain.com",
    "linkedin_url": "real URL or empty string",
    "email_pattern": "guess the email pattern if you can (e.g. first@company.com) or empty string",
    "why_qualified": "one sentence on why this company matches the criteria"
  }
] }`
      }],
      temperature: 0.3, // Low temperature for factual accuracy
      max_tokens: 8000,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text().catch(() => 'Unknown error');
    return NextResponse.json({ error: `OpenAI error: ${err.slice(0, 200)}` }, { status: 500 });
  }

  const aiData = await aiRes.json();
  const content = aiData.choices?.[0]?.message?.content;
  if (!content) return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });

  let parsed: { leads: Array<Record<string, string>> };
  try {
    parsed = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  if (!parsed.leads?.length) return NextResponse.json({ error: 'No leads generated' }, { status: 500 });

  // Stage 2: Verify websites in parallel (batches of 5)
  const verifiedLeads: Array<Record<string, string>> = [];
  const failedSites: string[] = [];

  for (let i = 0; i < parsed.leads.length && verifiedLeads.length < count; i += 5) {
    const batch = parsed.leads.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (lead) => {
        if (!lead.website || lead.website === '') return { lead, verified: false };
        const check = await verifyWebsite(lead.website);
        return { lead, verified: check.ok, resolvedUrl: check.resolvedUrl };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.verified && verifiedLeads.length < count) {
        verifiedLeads.push(r.value.lead);
      } else if (r.status === 'fulfilled' && !r.value.verified) {
        failedSites.push(r.value.lead.website || 'unknown');
      }
    }
  }

  if (!verifiedLeads.length) {
    return NextResponse.json({
      error: 'No leads passed website verification. Try broader criteria.',
      failed_sites: failedSites.slice(0, 10),
    }, { status: 422 });
  }

  // Stage 3: Insert verified leads into DB
  const rows = verifiedLeads.map((l) => ({
    campaign_id,
    agency_id: agencyId,
    first_name: l.first_name || '',
    last_name: l.last_name || '',
    full_name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || `Decision Maker at ${l.company}`,
    title: l.title || '',
    company: l.company || '',
    industry: l.industry || industry,
    company_size: l.company_size || companySize,
    location: l.location || location,
    website: l.website || '',
    linkedin_url: l.linkedin_url || '',
    email: l.email_pattern || '',
    stage: 'found',
    enrichment_data: {
      why_qualified: l.why_qualified || '',
      source: 'gpt-4o-verified',
      verified_at: new Date().toISOString(),
    },
  }));

  const { data: leads, error: insertErr } = await svc
    .from('pipeline_leads')
    .insert(rows)
    .select();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Update campaign counter
  await svc.from('pipeline_campaigns').update({
    leads_found: (campaign.leads_found ?? 0) + (leads?.length ?? 0),
  }).eq('id', campaign_id);

  return NextResponse.json({
    leads,
    count: leads?.length ?? 0,
    verified: verifiedLeads.length,
    dropped: failedSites.length,
    dropped_sites: failedSites.slice(0, 5), // show a few for debugging
  });
}
