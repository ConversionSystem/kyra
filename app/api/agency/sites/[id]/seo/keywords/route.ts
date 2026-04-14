import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agency/sites/[id]/seo/keywords
 * Returns tracked keywords for a site from seo_keyword_rankings.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { id: siteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClientWithoutCookies();

  const { data: site } = await service
    .from('client_sites')
    .select('id, agency_id')
    .eq('id', siteId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const { data: agency } = await service
    .from('agencies')
    .select('id')
    .eq('id', site.agency_id)
    .eq('owner_id', user.id)
    .single();

  if (!agency) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { data: keywords } = await service
    .from('seo_keyword_rankings')
    .select('*')
    .eq('site_id', siteId)
    .order('date', { ascending: false })
    .limit(200);

  return NextResponse.json({ data: keywords || [] });
}

/**
 * POST /api/agency/sites/[id]/seo/keywords
 * Save/upsert tracked keywords for a site.
 * Body: { keywords: Array<{ keyword: string; position?: number; source?: string }> }
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { id: siteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClientWithoutCookies();

  const { data: site } = await service
    .from('client_sites')
    .select('id, agency_id')
    .eq('id', siteId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const { data: agency } = await service
    .from('agencies')
    .select('id')
    .eq('id', site.agency_id)
    .eq('owner_id', user.id)
    .single();

  if (!agency) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const keywords = body.keywords as Array<{ keyword: string; position?: number; source?: string }> | undefined;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json({ error: 'keywords array is required' }, { status: 400 });
  }

  const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const rows = keywords.map(kw => ({
    site_id: siteId,
    keyword: kw.keyword,
    position: kw.position ?? null,
    url: null,
    date: now,
    source: kw.source || 'manual',
  }));

  const { error: upsertErr } = await service
    .from('seo_keyword_rankings')
    .upsert(rows, { onConflict: 'site_id,keyword,date' });

  if (upsertErr) {
    // Fallback: try insert (table may not have unique constraint)
    const { error: insertErr } = await service
      .from('seo_keyword_rankings')
      .insert(rows);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}
