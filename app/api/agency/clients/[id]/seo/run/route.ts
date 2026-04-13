/**
 * POST /api/agency/clients/[id]/seo/run
 *
 * Manually trigger a SEO worker task for a client.
 * Runs in Vercel serverless — no container required.
 *
 * Body: { task: 'geo_test' | 'nap_audit' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { deductCredits } from '@/lib/billing/credit-engine';
import { runGeoTest } from '@/templates/vet-seo-worker/skills/geo-tester/run';
import { runNAPAudit } from '@/templates/vet-seo-worker/skills/nap-auditor/run';
import { dispatchGeoTest, dispatchNapAudit, buildClientContext } from '@/lib/seo/worker-dispatcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface PageParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: PageParams) {
  const { id: clientId } = await params;

  const authResult = await requireAgencyAdmin();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error.message }, { status: authResult.error.status });
  }

  const { agency } = authResult.data;
  const supabase = await createClient();

  // Fetch client + verify ownership
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, settings')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (client.settings as Record<string, unknown>) ?? {};
  // Gate removed: SEO tasks now available for ALL clients with sites.
  // Legacy vet-seo-worker clients still use container-based skills;
  // all other clients use the new worker-dispatcher.
  const hasLegacyVetWorker = settings.premium_template === 'vet-seo-worker';
  const setup = (settings.premium_template_setup as Record<string, unknown>) ?? {};
  const body = await request.json();
  const { task } = body as { task: string };

  if (!task) {
    return NextResponse.json({ error: 'Missing task' }, { status: 400 });
  }

  // ── Check API keys before running ─────────────────────────────────────
  const openaiKey = process.env.OPENAI_API_KEY;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;

  if (task === 'geo_test' && (!openaiKey || !perplexityKey)) {
    const missing = [!openaiKey && 'OPENAI_API_KEY', !perplexityKey && 'PERPLEXITY_API_KEY'].filter(Boolean);
    return NextResponse.json({
      error: `Missing API keys: ${missing.join(', ')}. Add them in Vercel → Settings → Environment Variables.`,
      missing_keys: missing,
    }, { status: 422 });
  }

  if (task === 'nap_audit' && !firecrawlKey) {
    return NextResponse.json({
      error: 'Missing API key: FIRECRAWL_API_KEY. Add it in Vercel → Settings → Environment Variables.',
      missing_keys: ['FIRECRAWL_API_KEY'],
    }, { status: 422 });
  }

  // Build clinic config from setup wizard data
  const clinic = {
    clinic_name: (setup.clinic_name as string) || client.name,
    city: (setup.city as string) || '',
    state: (setup.state as string) || '',
    address: (setup.address as string) || '',
    address_area: (setup.city as string) || '',
    phone: (setup.phone as string) || '',
    website: (setup.website as string) || '',
    services: (setup.services as string[]) || [],
  };

  try {
    let result: unknown;

    if (task === 'geo_test') {
      console.log(`[seo/run] GEO test starting for ${clinic.clinic_name} in ${clinic.city}`);

      if (hasLegacyVetWorker) {
        // Legacy path: vet-seo-worker container-based runner
        const existing = (settings.seo_data as Record<string, unknown>) ?? {};
        const geoHistory = ((existing.geo_history as unknown[]) ?? []) as Array<{ overall_score: number }>;
        const previousScore = geoHistory[0]?.overall_score ?? null;
        result = await runGeoTest(clinic, previousScore, openaiKey!, perplexityKey!);

        const updatedHistory = [result, ...geoHistory];
        if (updatedHistory.length > 12) updatedHistory.splice(12);

        await supabase
          .from('agency_clients')
          .update({
            settings: {
              ...settings,
              seo_data: {
                ...existing,
                geo_history: updatedHistory,
                geo_last_run: new Date().toISOString(),
              },
            },
          })
          .eq('id', clientId);
      } else {
        // Universal path: worker-dispatcher writes to normalized tables
        const ctx = await buildClientContext(clientId);
        if (!ctx) {
          return NextResponse.json({ error: 'Could not build client context. Ensure client has a site.' }, { status: 400 });
        }
        result = await dispatchGeoTest(ctx);

        // Update last run timestamp in settings
        const existing = (settings.seo_data as Record<string, unknown>) ?? {};
        await supabase
          .from('agency_clients')
          .update({
            settings: { ...settings, seo_data: { ...existing, geo_last_run: new Date().toISOString() } },
          })
          .eq('id', clientId);
      }

    } else if (task === 'nap_audit') {
      console.log(`[seo/run] NAP audit starting for ${clinic.clinic_name}`);

      if (hasLegacyVetWorker) {
        // Legacy path: vet-seo-worker container-based runner
        const masterNAP = {
          name: clinic.clinic_name,
          address: clinic.address,
          phone: clinic.phone,
          website: clinic.website,
        };
        result = await runNAPAudit(masterNAP, clinic.city, firecrawlKey!);

        const existing = (settings.seo_data as Record<string, unknown>) ?? {};
        await supabase
          .from('agency_clients')
          .update({
            settings: {
              ...settings,
              seo_data: {
                ...existing,
                nap_audit_last: result,
                nap_last_run: new Date().toISOString(),
              },
            },
          })
          .eq('id', clientId);
      } else {
        // Universal path: worker-dispatcher writes to normalized tables
        const ctx = await buildClientContext(clientId);
        if (!ctx) {
          return NextResponse.json({ error: 'Could not build client context. Ensure client has a site.' }, { status: 400 });
        }
        result = await dispatchNapAudit(ctx);

        const existing = (settings.seo_data as Record<string, unknown>) ?? {};
        await supabase
          .from('agency_clients')
          .update({
            settings: { ...settings, seo_data: { ...existing, nap_last_run: new Date().toISOString() } },
          })
          .eq('id', clientId);
      }

    } else if (task === 'content_draft') {
      if (!openaiKey) {
        return NextResponse.json({ error: 'Missing OPENAI_API_KEY', missing_keys: ['OPENAI_API_KEY'] }, { status: 422 });
      }
      result = await generateContentDraft(clinic, openaiKey);

      const existingC = (settings.seo_data as Record<string, unknown>) ?? {};
      const drafts = ((existingC.content_published as unknown[]) ?? []) as Array<Record<string, unknown>>;
      drafts.unshift(result as Record<string, unknown>);
      if (drafts.length > 20) drafts.splice(20);

      await supabase
        .from('agency_clients')
        .update({ settings: { ...settings, seo_data: { ...existingC, content_published: drafts, content_last_run: new Date().toISOString() } } })
        .eq('id', clientId);

    } else if (task === 'reddit_scan') {
      result = await scanReddit(clinic);
      const existingR = (settings.seo_data as Record<string, unknown>) ?? {};
      const queue = ((existingR.reddit_queue as unknown[]) ?? []) as Array<Record<string, unknown>>;
      const newItems = result as Array<Record<string, unknown>>;
      const existingIds = new Set(queue.map((q: Record<string, unknown>) => q.post_id));
      const toAdd = newItems.filter((i: Record<string, unknown>) => !existingIds.has(i.post_id));
      const merged = [...toAdd, ...queue].slice(0, 50);
      await supabase
        .from('agency_clients')
        .update({ settings: { ...settings, seo_data: { ...existingR, reddit_queue: merged, reddit_last_run: new Date().toISOString() } } })
        .eq('id', clientId);
      result = { found: toAdd.length, total_queue: merged.length, items: toAdd };

    } else if (task === 'weekly_report') {
      const seoData = (settings.seo_data as Record<string, unknown>) ?? {};
      result = generateWeeklyReport(clinic, seoData);
      await supabase
        .from('agency_clients')
        .update({ settings: { ...settings, seo_data: { ...seoData, last_report: result, last_report_date: new Date().toISOString() } } })
        .eq('id', clientId);

    } else {
      return NextResponse.json({ error: `Unknown task: ${task}. Valid: geo_test, nap_audit, content_draft, reddit_scan, weekly_report` }, { status: 400 });
    }

    try {
      await deductCredits(agency.id, 'website.page_generation', {
        clientId,
        description: `SEO task: ${task}`,
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true, task, result });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[seo/run] ${task} failed for ${clientId}:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Content Draft Generator ───────────────────────────────────────────────────

async function generateContentDraft(
  clinic: Record<string, unknown>,
  openaiKey: string,
): Promise<Record<string, unknown>> {
  const services = (clinic.services as string[]) || [];
  const targetService = services[Math.floor(Math.random() * services.length)] || 'veterinary care';
  const platform = ['WordPress.com', 'Telegraph', 'Blogger', 'Notion'][Math.floor(Math.random() * 4)];

  const prompt = `Write a locally-optimized SEO article for a veterinary clinic. 

Clinic: ${clinic.clinic_name}
City: ${clinic.city}, ${clinic.state || ''}
Address: ${clinic.address || ''}
Phone: ${clinic.phone || ''}
Website: ${clinic.website || ''}
Target service: ${targetService}
Platform: ${platform}

Requirements:
- Title must include the city and the service
- 650-750 words
- 3 H2 sections: about the service, why choose this clinic, practical pet care tips
- End with a NAP block (name, address, phone)
- Mention the city 3-4 times naturally
- Include 2 links back to the clinic website
- Write for pet owners, friendly conversational tone
- Must be 100% unique content

Return as JSON: { "title": "...", "body": "...(HTML)...", "target_keyword": "...", "word_count": 123 }`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    }),
  });

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = JSON.parse(data.choices?.[0]?.message?.content || '{}') as Record<string, unknown>;

  return {
    title: content.title || `${targetService} in ${clinic.city} — ${clinic.clinic_name}`,
    body: content.body || '',
    platform,
    type: 'web20',
    target_keyword: content.target_keyword || `${targetService} ${clinic.city}`,
    word_count: content.word_count || 0,
    status: 'draft',
    url: null,
    published_at: new Date().toISOString(),
    generated_at: new Date().toISOString(),
  };
}

// ── Reddit Scanner ────────────────────────────────────────────────────────────

async function scanReddit(clinic: Record<string, unknown>): Promise<Array<Record<string, unknown>>> {
  const city = (clinic.city as string) || '';
  const state = (clinic.state as string) || '';
  const results: Array<Record<string, unknown>> = [];

  // Search strategies: city subreddit + broad vet subreddits
  const citySlug = city.toLowerCase().replace(/\s+/g, '');
  const searches: Array<{ sub: string; query: string }> = [
    // City-specific subreddit — most likely to have local vet questions
    { sub: citySlug, query: 'vet veterinarian pet' },
    { sub: `r_${citySlug}`, query: 'vet' },
    // Vet-specific subreddits with city filter
    { sub: 'AskVet', query: city },
    { sub: 'dogs', query: `vet ${city}` },
    { sub: 'cats', query: `vet ${city}` },
    // Broader search on r/all
    { sub: 'all', query: `veterinarian "${city}"` },
    { sub: 'all', query: `vet clinic "${city}" ${state}` },
  ];

  for (const { sub, query } of searches) {
    try {
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=new&limit=10&t=month`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KyraSEO/1.0)' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const json = await res.json() as { data?: { children?: Array<{ data: Record<string, unknown> }> } };
      const posts = json?.data?.children || [];
      for (const post of posts) {
        const d = post.data;
        if (!d.id) continue;
        results.push({
          post_id: d.id,
          subreddit: d.subreddit,
          title: d.title,
          url: `https://reddit.com${d.permalink}`,
          score: d.score,
          num_comments: d.num_comments,
          created_utc: d.created_utc,
          status: 'pending_review',
          draft_reply: null,
          found_at: new Date().toISOString(),
        });
      }
    } catch {
      // Non-fatal, continue
    }
  }

  return results;
}

// ── Weekly Report Generator ───────────────────────────────────────────────────

function generateWeeklyReport(
  clinic: Record<string, unknown>,
  seoData: Record<string, unknown>,
): Record<string, unknown> {
  const geoHistory = (seoData.geo_history as Array<Record<string, unknown>>) || [];
  const latestGeo = geoHistory[0];
  const napAudit = (seoData.nap_audit_last as Record<string, unknown>) || null;
  const content = (seoData.content_published as unknown[]) || [];
  const redditQueue = (seoData.reddit_queue as Array<Record<string, unknown>>) || [];

  const geoScore = latestGeo?.overall_score as number ?? null;
  const geoTrend = latestGeo?.trend as string ?? 'stable';
  const napIssues = napAudit
    ? ((napAudit.results as Array<Record<string, unknown>>) || []).filter(r => r.status === 'mismatch').length
    : null;
  const contentThisWeek = (content as Array<Record<string, unknown>>).filter((c) => {
    const pub = new Date((c.published_at as string) || 0);
    return Date.now() - pub.getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const actionItems: string[] = [];
  if (napIssues && napIssues > 0) actionItems.push(`Fix ${napIssues} NAP mismatch${napIssues > 1 ? 'es' : ''} in directories`);
  if (redditQueue.filter(r => r.status === 'pending_review').length > 0) actionItems.push('Review pending Reddit reply drafts');
  if (geoScore !== null && geoScore < 20) actionItems.push('GEO score is low — accelerate content publishing to build citations');
  if (content.length === 0) actionItems.push('Publish first Web 2.0 articles to build topical authority');

  return {
    report_date: new Date().toISOString().split('T')[0],
    clinic: clinic.clinic_name,
    city: clinic.city,
    geo_score: geoScore,
    geo_trend: geoTrend,
    nap_issues: napIssues,
    content_published_this_week: contentThisWeek,
    content_total: content.length,
    reddit_pending: redditQueue.filter(r => r.status === 'pending_review').length,
    action_items: actionItems,
    summary: `Week ending ${new Date().toLocaleDateString()}. GEO citation rate: ${geoScore !== null ? geoScore + '%' : 'not yet tested'}. NAP issues: ${napIssues !== null ? napIssues : 'not yet audited'}. Content published this week: ${contentThisWeek}.`,
  };
}
