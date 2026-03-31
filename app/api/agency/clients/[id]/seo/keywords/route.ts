import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { searchKeywords, getKeywordVolume } from '@/lib/seo/dataforseo';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agency/clients/[id]/seo/keywords?seed=dental+marketing&limit=50
 * Returns keyword research results for a seed term.
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

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const credentials = cfg.dataforseo_login && cfg.dataforseo_password
    ? { login: cfg.dataforseo_login as string, password: cfg.dataforseo_password as string }
    : undefined;

  const { searchParams } = new URL(request.url);
  const seed = searchParams.get('seed');
  if (!seed) {
    return NextResponse.json({ error: 'Missing seed parameter' }, { status: 400 });
  }

  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const location = parseInt(searchParams.get('location') || '2840', 10);

  try {
    const result = await searchKeywords(seed, { limit, location }, credentials);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/agency/clients/[id]/seo/keywords
 * Batch validate keywords — accepts { keywords: string[] }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

  const cfgPost = (client.container_config as Record<string, unknown>) ?? {};
  const credentialsPost = cfgPost.dataforseo_login && cfgPost.dataforseo_password
    ? { login: cfgPost.dataforseo_login as string, password: cfgPost.dataforseo_password as string }
    : undefined;

  const body = await request.json();
  const { keywords } = body as { keywords?: string[] };

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json({ error: 'Missing or empty keywords array' }, { status: 400 });
  }

  try {
    const result = await getKeywordVolume(keywords, credentialsPost);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
