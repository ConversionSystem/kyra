import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

  if (clientSettings.premium_template !== 'vet-seo-worker') {
    return NextResponse.json({ error: 'Client does not have SEO worker template' }, { status: 400 });
  }

  const setupData = (clientSettings.premium_template_setup as Record<string, unknown>) ?? {};

  // Fetch SEO data from seo_data table (or settings JSONB)
  const seoData = (clientSettings.seo_data as Record<string, unknown>) ?? {};

  return NextResponse.json({
    template: 'vet-seo-worker',
    status: clientSettings.premium_template_status || 'active',
    activated_at: clientSettings.premium_template_activated_at || null,
    setup: setupData,
    geo_scores: (seoData.geo_scores as unknown[]) || [],
    nap_status: (seoData.nap_status as unknown[]) || [],
    content_published: (seoData.content_published as unknown[]) || [],
    outreach_pipeline: (seoData.outreach_pipeline as unknown[]) || [],
    reddit_queue: (seoData.reddit_queue as unknown[]) || [],
    last_report: seoData.last_report || null,
    stats: {
      geo_score_current: seoData.geo_score_current ?? null,
      geo_score_trend: seoData.geo_score_trend ?? null,
      content_count: ((seoData.content_published as unknown[]) || []).length,
      nap_issues: ((seoData.nap_status as Array<Record<string, unknown>>) || []).filter(
        (n) => n.status === 'mismatch',
      ).length,
      pending_reviews: ((seoData.reddit_queue as Array<Record<string, unknown>>) || []).filter(
        (r) => r.status === 'pending',
      ).length,
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
  const validTypes = ['geo_scores', 'nap_status', 'content_published', 'outreach_pipeline', 'reddit_queue', 'last_report', 'geo_score_current', 'geo_score_trend'];

  if (!validTypes.includes(dataType)) {
    return NextResponse.json({ error: 'Invalid dataType' }, { status: 400 });
  }

  seoData[dataType] = data;
  settings.seo_data = seoData;

  await supabase
    .from('agency_clients')
    .update({ settings })
    .eq('id', id);

  return NextResponse.json({ ok: true, dataType });
}
