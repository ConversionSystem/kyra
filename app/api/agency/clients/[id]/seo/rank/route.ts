import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { getRankings, getCompetitorKeywords } from '@/lib/seo/dataforseo';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agency/clients/[id]/seo/rank?domain=example.com&keywords=kw1,kw2
 * Returns rankings for a domain. If no keywords provided, returns competitor keywords.
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
    .select('id, agency_id')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });
  }

  const keywordsParam = searchParams.get('keywords');

  try {
    if (keywordsParam) {
      const keywords = keywordsParam.split(',').map((k) => k.trim()).filter(Boolean);
      if (keywords.length === 0) {
        return NextResponse.json({ error: 'Empty keywords list' }, { status: 400 });
      }
      const result = await getRankings(domain, keywords);
      return NextResponse.json(result);
    } else {
      const result = await getCompetitorKeywords(domain);
      return NextResponse.json(result);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
