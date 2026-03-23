import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { getPerformance, getQuickWins, getRankingDrops } from '@/lib/integrations/gsc';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agency/clients/[id]/gsc?type=performance&site=https://example.com
 * Also supports type=quick_wins and type=drops
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: clientId } = await params;

  const authResult = await requireAgencyMember();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error.message }, { status: authResult.error.status });
  }

  const { agency } = authResult.data;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, agency_id, container_config')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'performance';
  const containerConfig = (client.container_config as Record<string, unknown>) ?? {};
  const siteUrl = searchParams.get('site') || (containerConfig.gsc_site_url as string) || '';

  if (!siteUrl) {
    return NextResponse.json({ error: 'Missing site URL. Pass ?site= or set gsc_site_url in client config.' }, { status: 400 });
  }

  try {
    switch (type) {
      case 'performance': {
        const startDate = searchParams.get('start') || new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];
        const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
        const dimensions = (searchParams.get('dimensions') || 'query').split(',') as ('query' | 'page' | 'country' | 'device')[];
        const rowLimit = parseInt(searchParams.get('limit') || '100', 10);

        const result = await getPerformance(siteUrl, { startDate, endDate, dimensions, rowLimit });
        return NextResponse.json(result);
      }

      case 'quick_wins': {
        const result = await getQuickWins(siteUrl);
        return NextResponse.json(result);
      }

      case 'drops': {
        const days = parseInt(searchParams.get('days') || '7', 10);
        const result = await getRankingDrops(siteUrl, days);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${type}. Valid: performance, quick_wins, drops` }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
