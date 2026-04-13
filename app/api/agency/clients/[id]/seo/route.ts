import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClient } from '@/lib/agency/queries';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agency/clients/[id]/seo
 * Returns the SEO dashboard data for a client with a premium SEO template.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const client = await getAgencyClient(id);
  if (!client || client.agency_id !== result.agency.id) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const clientSettings = ((client as unknown as Record<string, unknown>).settings as Record<string, unknown>) ?? {};
  const setupData = (clientSettings.premium_template_setup as Record<string, unknown>) ?? {};
  const seoData = (clientSettings.seo_data as Record<string, unknown>) ?? {};
  const redditQueue = (seoData.reddit_queue as Array<Record<string, unknown>>) || [];
  const publishingPlatforms = (seoData.publishing_platforms as string[]) ?? ['telegraph'];

  // ── Dual-read: normalized tables (preferred) + legacy JSONB fallback ──
  const service = createServiceClientWithoutCookies();
  const startDate90 = new Date(Date.now() - 90 * 86400000).toISOString();

  const [geoRes, napRes, gapsRes, competitorRes, publishedRes] = await Promise.all([
    service.from('seo_geo_results').select('*').eq('client_id', id)
      .gte('tested_at', startDate90).order('tested_at', { ascending: false }).limit(200),
    service.from('seo_nap_audits').select('*').eq('client_id', id)
      .order('audited_at', { ascending: false }).limit(100),
    service.from('seo_content_gaps').select('*').eq('client_id', id)
      .eq('resolved', false).order('priority_score', { ascending: false }).limit(20),
    service.from('seo_competitor_scores').select('*').eq('client_id', id)
      .order('tested_at', { ascending: false }).limit(50),
    service.from('seo_published_content').select('*').eq('client_id', id)
      .order('published_at', { ascending: false }).limit(50),
  ]);

  const normalizedGeo = geoRes.data || [];
  const normalizedNap = napRes.data || [];
  const normalizedGaps = gapsRes.data || [];
  const normalizedCompetitors = competitorRes.data || [];
  const normalizedPublished = publishedRes.data || [];

  // GEO: prefer normalized table, fall back to legacy JSONB
  const geoHistory = (seoData.geo_history as Array<Record<string, unknown>>) || [];
  const latestGeo = geoHistory[0] ?? null;
  const legacyGeoScores = latestGeo
    ? (latestGeo.results as unknown[]) || []
    : (seoData.geo_scores as unknown[]) || [];
  const geoScores = normalizedGeo.length > 0 ? normalizedGeo : legacyGeoScores;

  // GEO overall score from normalized data
  const latestBatchId = normalizedGeo[0]?.batch_id;
  const latestBatch = latestBatchId
    ? normalizedGeo.filter(r => r.batch_id === latestBatchId) : [];
  const citedCount = latestBatch.filter(r => r.cited).length;
  const normalizedGeoScore = latestBatch.length > 0
    ? Math.round((citedCount / latestBatch.length) * 100) : null;

  // NAP: prefer normalized, fall back to legacy
  const napAuditLast = (seoData.nap_audit_last as Record<string, unknown>) ?? null;
  const legacyNap = napAuditLast
    ? (napAuditLast.results as unknown[]) || []
    : (seoData.nap_status as unknown[]) || [];
  const napStatus = normalizedNap.length > 0 ? normalizedNap : legacyNap;
  const napIssues = (napStatus as Array<Record<string, unknown>>).filter(
    (n) => n.status === 'mismatch',
  ).length;

  // Content: prefer normalized, fall back to legacy
  const legacyContent = (seoData.content_published as unknown[]) || [];
  const contentPublished = normalizedPublished.length > 0 ? normalizedPublished : legacyContent;

  // Content gaps + competitors: normalized only (no legacy equivalent)
  const contentGaps = normalizedGaps;
  const competitorScores = normalizedCompetitors;

  // Determine industry from site data if available
  const siteRes = await service.from('client_sites').select('industry')
    .eq('client_id', id).order('created_at', { ascending: false }).limit(1).single();
  const industry = siteRes.data?.industry || (setupData.industry as string) || 'general';

  return NextResponse.json({
    template: 'seo-command-center',
    industry,
    status: clientSettings.premium_template_status || 'active',
    activated_at: clientSettings.premium_template_activated_at || null,
    setup: setupData,
    geo_scores: geoScores,
    nap_status: napStatus,
    content_published: contentPublished,
    publishing_platforms: publishingPlatforms,
    outreach_pipeline: (seoData.outreach_pipeline as unknown[]) || [],
    reddit_queue: redditQueue,
    last_report: seoData.last_report || null,
    geo_last_run: seoData.geo_last_run || null,
    nap_last_run: seoData.nap_last_run || null,
    content_gaps: contentGaps,
    competitor_scores: competitorScores,
    directory_submissions: (seoData.directory_submissions as unknown[]) || [],
    backlink_profile: seoData.backlink_profile || null,
    gbp_posts: (seoData.gbp_posts as unknown[]) || [],
    platform_statuses: (seoData.platform_statuses as unknown[]) || [],
    stats: {
      geo_score_current: normalizedGeoScore ?? latestGeo?.overall_score ?? (seoData.geo_score_current as number) ?? null,
      geo_score_trend: latestGeo?.trend ?? (seoData.geo_score_trend as string) ?? null,
      content_count: contentPublished.length,
      nap_issues: napIssues,
      pending_reviews: redditQueue.filter((r) => r.status === 'pending').length,
      platforms_ready: ((seoData.platform_statuses as Array<Record<string, unknown>>) || []).filter(
        (p) => p.status === 'ready',
      ).length,
      competitor_count: competitorScores.length,
      backlink_total: ((seoData.backlink_profile as Record<string, unknown>)?.total_backlinks as number) ?? null,
      content_gaps_count: contentGaps.length,
    },
  });
}

/**
 * PUT /api/agency/clients/[id]/seo
 * Updates SEO data for a client (called by the SEO worker agent or cron).
 * Secured by CRON_SECRET for automated calls.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Auth: either logged-in user or cron secret
  const authHeader = request.headers.get('authorization');
  const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  let agencyId: string | null = null;

  if (isCron) {
    // Cron/agent call — verify client exists
    const supabase = await createClient();
    const { data: client } = await supabase
      .from('agency_clients')
      .select('agency_id')
      .eq('id', id)
      .single();
    agencyId = client?.agency_id ?? null;
  } else {
    // User call — verify ownership
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await getAgencyForUser(user.id);
    if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

    const client = await getAgencyClient(id);
    if (!client || client.agency_id !== result.agency.id) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    agencyId = result.agency.id;
  }

  if (!agencyId) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const body = await request.json();
  const { dataType, data } = body;

  if (!dataType || !data) {
    return NextResponse.json({ error: 'Missing dataType or data' }, { status: 400 });
  }

  const supabase = await createClient();

  // Get current settings
  const { data: client } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', id)
    .single();

  const settings = ((client?.settings as Record<string, unknown>) ?? {});
  const seoData = ((settings.seo_data as Record<string, unknown>) ?? {});

  // Update specific data type
  const validTypes = [
    'geo_scores', 'nap_status', 'content_published', 'outreach_pipeline',
    'reddit_queue', 'last_report', 'geo_score_current', 'geo_score_trend',
    'geo_history',
    // New v2 types
    'competitor_scores', 'content_gaps', 'directory_submissions',
    'backlink_profile', 'gbp_posts', 'platform_statuses',
    'nap_audit_last',
  ];

  if (!validTypes.includes(dataType)) {
    return NextResponse.json({ error: 'Invalid dataType' }, { status: 400 });
  }

  seoData[dataType] = data;
  settings.seo_data = seoData;

  await supabase
    .from('agency_clients')
    .update({ settings })
    .eq('id', id);

  // ── Auto-publish: if content_published was updated, publish any "approved" items ──
  if (dataType === 'content_published' && Array.isArray(data)) {
    const approved = data.filter(
      (item: Record<string, unknown>) => item.status === 'approved' && item.target_platform && !item.url,
    );

    for (const item of approved) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';

        const publishRes = await fetch(`${baseUrl}/api/agency/clients/${id}/seo/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CRON_SECRET || ''}`,
          },
          body: JSON.stringify({
            platform: item.target_platform,
            title: item.title,
            body: item.content_html || item.content_markdown || '',
            published_at: item.published_at,
          }),
        });

        if (!publishRes.ok) {
          console.error(`[seo] Auto-publish failed for "${item.title}" on ${item.target_platform}`);
        } else {
          console.log(`[seo] Auto-published "${item.title}" to ${item.target_platform}`);
        }
      } catch (err) {
        console.error(`[seo] Auto-publish error:`, err);
      }
    }
  }

  return NextResponse.json({ ok: true, dataType });
}

// PATCH — update a single field in seo_data (e.g. publishing_platforms)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const client = await getAgencyClient(id);
  if (!client || client.agency_id !== result.agency.id) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const body = await request.json() as { field: string; value: unknown };
  const { field, value } = body;

  const settings = ((client.settings as Record<string, unknown>) ?? {});
  const seoData  = ((settings.seo_data as Record<string, unknown>) ?? {});

  // ── Admin actions ────────────────────────────────────────────────────
  if (field === 'admin_action' && typeof value === 'object' && value !== null) {
    const actionData = value as Record<string, unknown>;
    const action = actionData.action as string;

    switch (action) {
      case 'start': {
        settings.premium_template_status = 'active';
        await supabase.from('agency_clients').update({ settings }).eq('id', id);
        return NextResponse.json({ ok: true, action: 'start', status: 'active' });
      }
      case 'pause': {
        settings.premium_template_status = 'paused';
        await supabase.from('agency_clients').update({ settings }).eq('id', id);
        return NextResponse.json({ ok: true, action: 'pause', status: 'paused' });
      }
      case 'delete': {
        settings.premium_template_status = 'deleted';
        // Keep data for recovery, just mark as deleted
        await supabase.from('agency_clients').update({ settings }).eq('id', id);
        return NextResponse.json({ ok: true, action: 'delete', status: 'deleted' });
      }
      case 'edit': {
        const newSetup = actionData.setup as Record<string, unknown>;
        if (newSetup) {
          settings.premium_template_setup = {
            ...((settings.premium_template_setup as Record<string, unknown>) ?? {}),
            ...newSetup,
          };
        }
        await supabase.from('agency_clients').update({ settings }).eq('id', id);
        return NextResponse.json({ ok: true, action: 'edit' });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  }

  // ── Standard field patches ───────────────────────────────────────────
  const PATCHABLE = ['publishing_platforms', 'geo_score_current', 'geo_score_trend'];
  if (!PATCHABLE.includes(field)) {
    return NextResponse.json({ error: 'Field not patchable' }, { status: 400 });
  }

  seoData[field] = value;
  settings.seo_data = seoData;

  await supabase.from('agency_clients').update({ settings }).eq('id', id);

  return NextResponse.json({ ok: true, field });
}
