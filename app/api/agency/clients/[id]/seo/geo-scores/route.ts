import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClient } from '@/lib/agency/queries';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agency/clients/[id]/seo/geo-scores
 * Returns GEO test results from the normalized seo_geo_results table.
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

  const service = createServiceClientWithoutCookies();

  // Fetch latest GEO results (last 90 days)
  const startDate = new Date(Date.now() - 90 * 86400000).toISOString();

  const [geoResults, contentGaps, competitorScores] = await Promise.all([
    service
      .from('seo_geo_results')
      .select('*')
      .eq('client_id', id)
      .gte('tested_at', startDate)
      .order('tested_at', { ascending: false })
      .limit(200),
    service
      .from('seo_content_gaps')
      .select('*')
      .eq('client_id', id)
      .eq('resolved', false)
      .order('priority_score', { ascending: false })
      .limit(20),
    service
      .from('seo_competitor_scores')
      .select('*')
      .eq('client_id', id)
      .order('tested_at', { ascending: false })
      .limit(50),
  ]);

  // Compute overall score from latest batch
  const latestBatchId = geoResults.data?.[0]?.batch_id;
  const latestBatch = latestBatchId
    ? (geoResults.data || []).filter(r => r.batch_id === latestBatchId)
    : [];
  const citedCount = latestBatch.filter(r => r.cited).length;
  const overallScore = latestBatch.length > 0
    ? Math.round((citedCount / latestBatch.length) * 100)
    : null;

  return NextResponse.json({
    geo_results: geoResults.data || [],
    content_gaps: contentGaps.data || [],
    competitor_scores: competitorScores.data || [],
    stats: {
      overall_score: overallScore,
      total_queries_tested: latestBatch.length,
      cited_count: citedCount,
      latest_batch_id: latestBatchId || null,
    },
  });
}
