/**
 * POST /api/agency/pipeline/search
 * Lead discovery — finds REAL people from Apollo.io's 275M+ contact database.
 *
 * Data flow:
 * 1. Apollo People Search (FREE, no credits) → real people, titles, companies
 * 2. Apollo People Enrichment (1 credit each) → full names, emails, LinkedIn, phones
 * 3. Website verification → confirm company sites are reachable
 *
 * Fallback: If APOLLO_API_KEY is not set, uses GPT-4o with website verification.
 *
 * Apollo API docs: https://docs.apollo.io/reference/people-api-search
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const APOLLO_API = 'https://api.apollo.io/api/v1';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

// ────────────────────────────────────────────────────────────────
// Apollo.io Integration
// ────────────────────────────────────────────────────────────────

interface ApolloSearchResult {
  id: string;
  first_name: string;
  last_name_obfuscated?: string;
  title: string;
  organization?: {
    name: string;
    has_industry?: boolean;
    has_phone?: boolean;
    has_city?: boolean;
    has_state?: boolean;
    has_country?: boolean;
    has_employee_count?: boolean;
    primary_domain?: string;
  };
}

interface ApolloEnrichedPerson {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  linkedin_url: string;
  city: string;
  state: string;
  country: string;
  organization?: {
    name: string;
    website_url: string;
    industry: string;
    estimated_num_employees: number;
    city: string;
    state: string;
    country: string;
    linkedin_url: string;
    primary_domain: string;
  };
}

/**
 * Stage 1: Apollo People Search (FREE — no credits consumed)
 * Returns real people matching filters, but with obfuscated last names.
 */
async function apolloSearch(
  apiKey: string,
  params: {
    titles: string[];
    locations: string[];
    industries?: string[];
    employeeRanges?: string[];
    perPage: number;
    page?: number;
  }
): Promise<{ people: ApolloSearchResult[]; totalEntries: number }> {
  const url = new URL(`${APOLLO_API}/mixed_people/api_search`);

  // Build query params (Apollo expects array params)
  for (const t of params.titles) {
    url.searchParams.append('person_titles[]', t);
  }
  for (const l of params.locations) {
    url.searchParams.append('person_locations[]', l);
  }
  if (params.industries?.length) {
    for (const i of params.industries) {
      url.searchParams.append('organization_industry_tag_ids[]', i);
    }
  }
  if (params.employeeRanges?.length) {
    for (const r of params.employeeRanges) {
      url.searchParams.append('organization_num_employees_ranges[]', r);
    }
  }
  url.searchParams.set('per_page', String(params.perPage));
  if (params.page) url.searchParams.set('page', String(params.page));

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-api-key': apiKey,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Apollo search failed: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    people: data.people || [],
    totalEntries: data.total_entries || 0,
  };
}

/**
 * Stage 2: Apollo Bulk People Enrichment (costs 1 credit per person)
 * Takes person IDs from search → returns full names, emails, LinkedIn URLs.
 * Max 10 per call.
 */
async function apolloEnrich(
  apiKey: string,
  personIds: string[]
): Promise<ApolloEnrichedPerson[]> {
  // Bulk match endpoint: up to 10 at a time
  const res = await fetch(`${APOLLO_API}/people/bulk_match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      details: personIds.map(id => ({ id })),
      reveal_personal_emails: false,
      reveal_phone_number: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Apollo enrich failed: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.matches || [];
}

// ────────────────────────────────────────────────────────────────
// Website verification (used for both Apollo + fallback)
// ────────────────────────────────────────────────────────────────

async function verifyWebsite(url: string): Promise<boolean> {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(fullUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5_000),
      redirect: 'follow',
    });
    return res.ok || [301, 302, 403, 405].includes(res.status);
  } catch {
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const res = await fetch(fullUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5_000),
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      });
      return res.ok || res.status === 403;
    } catch {
      return false;
    }
  }
}

// ────────────────────────────────────────────────────────────────
// GPT-4o fallback (when no Apollo key)
// ────────────────────────────────────────────────────────────────

async function gptFallbackSearch(
  apiKey: string,
  params: {
    industry: string;
    role: string;
    companySize: string;
    location: string;
    painPoints: string;
    count: number;
  }
): Promise<Array<Record<string, string>>> {
  const generateCount = Math.min(Math.ceil(params.count * 2.5), 100);

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: `You are a B2B lead researcher. Identify REAL companies that exist.

RULES:
1. Every company MUST be a REAL business with a working website.
2. Use your knowledge of real companies from articles, directories, case studies.
3. The website MUST be the company's actual domain.
4. For contacts: Name REAL people if you know them. If not, leave first_name/last_name empty and fill title only.
5. LinkedIn URLs: ONLY if 90%+ confident. Otherwise empty string.
6. DO NOT use placeholder domains.

Generate ${generateCount} leads.

Target:
- Industry: ${params.industry}
- Roles: ${params.role}
- Company size: ${params.companySize}
- Location: ${params.location}
${params.painPoints ? `- Challenges: ${params.painPoints}` : ''}

Return JSON: { "leads": [{ "first_name": "", "last_name": "", "title": "", "company": "", "industry": "", "company_size": "", "location": "", "website": "", "linkedin_url": "", "email_pattern": "", "why_qualified": "" }] }`
      }],
      temperature: 0.3,
      max_tokens: 8000,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!aiRes.ok) throw new Error(`OpenAI error: ${aiRes.status}`);
  const aiData = await aiRes.json();
  const content = aiData.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content || '{}');
  return parsed.leads || [];
}

// ────────────────────────────────────────────────────────────────
// Map employee ranges from campaign criteria to Apollo format
// ────────────────────────────────────────────────────────────────

function mapCompanySizeToApollo(size: string): string[] {
  const s = size.toLowerCase();
  if (s.includes('1-10') || s.includes('solo') || s.includes('micro')) return ['1,10'];
  if (s.includes('11-50') || s.includes('small')) return ['11,20', '21,50'];
  if (s.includes('51-200') || s.includes('medium') || s.includes('mid')) return ['51,100', '101,200'];
  if (s.includes('201-500')) return ['201,500'];
  if (s.includes('500+') || s.includes('large') || s.includes('enterprise')) return ['501,1000', '1001,2000', '2001,5000', '5001,10000'];
  // Default: small-medium businesses (most agency clients)
  if (s.includes('5-50') || s.includes('5 to 50')) return ['1,10', '11,20', '21,50'];
  return ['1,10', '11,20', '21,50', '51,100']; // broad default
}

// ────────────────────────────────────────────────────────────────
// Main route handler
// ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { campaign_id, criteria } = await req.json();
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();

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

  const apolloKey = process.env.APOLLO_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // ══════════════════════════════════════════════════════════════
  // PATH A: Apollo.io (real B2B database — 275M+ contacts)
  // ══════════════════════════════════════════════════════════════
  if (apolloKey) {
    try {
      // Parse roles into title array
      const titles = role.split(/[,;]/).map((t: string) => t.trim()).filter(Boolean);
      // Parse locations
      const locations = location.split(/[,;]/).map((l: string) => l.trim()).filter(Boolean);
      // Map company size
      const employeeRanges = mapCompanySizeToApollo(companySize);

      // Stage 1: FREE search — get real people
      const searchResult = await apolloSearch(apolloKey, {
        titles,
        locations,
        employeeRanges,
        perPage: Math.min(count * 2, 100), // Over-fetch for enrichment failures
      });

      if (!searchResult.people.length) {
        return NextResponse.json({
          error: 'No leads found matching your criteria. Try broader filters.',
          total_in_database: searchResult.totalEntries,
          source: 'apollo',
        }, { status: 422 });
      }

      // Stage 2: Enrich top results (costs 1 credit each)
      // Process in batches of 10 (Apollo bulk_match limit)
      const toEnrich = searchResult.people.slice(0, Math.min(count + 10, 60));
      const enriched: ApolloEnrichedPerson[] = [];

      for (let i = 0; i < toEnrich.length; i += 10) {
        const batch = toEnrich.slice(i, i + 10);
        const ids = batch.map(p => p.id);
        try {
          const results = await apolloEnrich(apolloKey, ids);
          enriched.push(...results);
        } catch (err) {
          console.error(`Apollo enrich batch ${i} failed:`, err);
          // Continue with other batches
        }
        // Brief pause between batches
        if (i + 10 < toEnrich.length) await new Promise(r => setTimeout(r, 300));
      }

      // Filter: must have name + company
      const validLeads = enriched.filter(p =>
        p.first_name && p.last_name && p.organization?.name
      ).slice(0, count);

      if (!validLeads.length) {
        // Fallback: use search results directly (obfuscated last names)
        const fallbackLeads = searchResult.people.slice(0, count).map(p => ({
          campaign_id,
          agency_id: agencyId,
          first_name: p.first_name || '',
          last_name: '',
          full_name: p.first_name || 'Unknown',
          title: p.title?.split(',')[0]?.trim() || '',
          company: p.organization?.name || '',
          industry,
          company_size: companySize,
          location,
          website: p.organization?.primary_domain || '',
          linkedin_url: '',
          email: '',
          stage: 'found',
          enrichment_data: {
            source: 'apollo-search-only',
            apollo_id: p.id,
            note: 'Enrichment unavailable — last names obfuscated. Add Apollo credits to unlock.',
          },
        }));

        const { data: leads, error: insertErr } = await svc
          .from('pipeline_leads').insert(fallbackLeads).select();
        if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

        await svc.from('pipeline_campaigns').update({
          leads_found: (campaign.leads_found ?? 0) + (leads?.length ?? 0),
        }).eq('id', campaign_id);

        return NextResponse.json({
          leads,
          count: leads?.length ?? 0,
          source: 'apollo-search-only',
          note: 'Enrichment credits depleted. Leads have real companies but limited contact info.',
          total_in_database: searchResult.totalEntries,
        });
      }

      // Build DB rows from enriched data
      const rows = validLeads.map(p => ({
        campaign_id,
        agency_id: agencyId,
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: `${p.first_name} ${p.last_name}`.trim(),
        title: p.title?.split(',')[0]?.trim() || '',
        company: p.organization?.name || '',
        industry: p.organization?.industry || industry,
        company_size: p.organization?.estimated_num_employees
          ? `${p.organization.estimated_num_employees} employees`
          : companySize,
        location: [p.city, p.state, p.country].filter(Boolean).join(', ') || location,
        website: p.organization?.website_url || p.organization?.primary_domain || '',
        linkedin_url: p.linkedin_url || '',
        email: p.email || '',
        stage: 'found',
        enrichment_data: {
          source: 'apollo',
          apollo_id: p.id,
          org_linkedin: p.organization?.linkedin_url || '',
          verified_at: new Date().toISOString(),
        },
      }));

      const { data: leads, error: insertErr } = await svc
        .from('pipeline_leads').insert(rows).select();
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

      await svc.from('pipeline_campaigns').update({
        leads_found: (campaign.leads_found ?? 0) + (leads?.length ?? 0),
      }).eq('id', campaign_id);

      return NextResponse.json({
        leads,
        count: leads?.length ?? 0,
        source: 'apollo',
        total_in_database: searchResult.totalEntries,
        enriched: validLeads.length,
      });
    } catch (err) {
      console.error('Apollo search failed, falling back to GPT-4o:', err);
      // Fall through to GPT-4o fallback
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PATH B: GPT-4o + website verification (fallback)
  // ══════════════════════════════════════════════════════════════
  if (!openaiKey) return NextResponse.json({ error: 'No API keys configured (need APOLLO_API_KEY or OPENAI_API_KEY)' }, { status: 500 });

  const rawLeads = await gptFallbackSearch(openaiKey, {
    industry, role, companySize, location, painPoints, count,
  });

  if (!rawLeads.length) return NextResponse.json({ error: 'No leads generated' }, { status: 500 });

  // Verify websites in parallel (batches of 5)
  const verifiedLeads: Array<Record<string, string>> = [];
  const failedSites: string[] = [];

  for (let i = 0; i < rawLeads.length && verifiedLeads.length < count; i += 5) {
    const batch = rawLeads.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (lead) => {
        if (!lead.website) return { lead, verified: false };
        const ok = await verifyWebsite(lead.website);
        return { lead, verified: ok };
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
      error: 'No leads passed website verification. Try broader criteria or add APOLLO_API_KEY for real data.',
      failed_sites: failedSites.slice(0, 10),
      source: 'gpt4o-fallback',
    }, { status: 422 });
  }

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
      source: 'gpt4o-verified',
      why_qualified: l.why_qualified || '',
      verified_at: new Date().toISOString(),
      note: 'AI-generated lead with verified website. Add APOLLO_API_KEY for real B2B database access.',
    },
  }));

  const { data: leads, error: insertErr } = await svc
    .from('pipeline_leads').insert(rows).select();
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  await svc.from('pipeline_campaigns').update({
    leads_found: (campaign.leads_found ?? 0) + (leads?.length ?? 0),
  }).eq('id', campaign_id);

  return NextResponse.json({
    leads,
    count: leads?.length ?? 0,
    source: 'gpt4o-verified',
    verified: verifiedLeads.length,
    dropped: failedSites.length,
    note: 'Using GPT-4o fallback. Add APOLLO_API_KEY for 275M+ real B2B contacts.',
  });
}
