import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { createVideo, getVideoStatus } from '@/lib/integrations/heygen';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agency/clients/[id]/video/generate
 * Create a new AI avatar video. Body: { script, avatarId?, voiceId?, backgroundUrl? }
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
    .select('id, agency_id')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const body = await request.json();
  const { script, avatarId, voiceId, backgroundUrl } = body as {
    script?: string;
    avatarId?: string;
    voiceId?: string;
    backgroundUrl?: string;
  };

  if (!script) {
    return NextResponse.json({ error: 'Missing script' }, { status: 400 });
  }

  try {
    const result = await createVideo({ script, avatarId, voiceId, backgroundUrl });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/agency/clients/[id]/video/generate?videoId=xxx
 * Check video generation status.
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
  const videoId = searchParams.get('videoId');
  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
  }

  try {
    const result = await getVideoStatus(videoId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
