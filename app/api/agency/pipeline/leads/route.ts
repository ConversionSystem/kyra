/**
 * GET /api/agency/pipeline/leads?campaign_id=X&stage=Y
 * List leads for a campaign, optionally filtered by stage
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id');
  const stage = searchParams.get('stage');

  const svc = createServiceClientWithoutCookies();

  let query = svc
    .from('pipeline_leads')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (campaignId) query = query.eq('campaign_id', campaignId);
  if (stage) query = query.eq('stage', stage);

  const { data: leads, error } = await query.limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leads: leads ?? [] });
}
