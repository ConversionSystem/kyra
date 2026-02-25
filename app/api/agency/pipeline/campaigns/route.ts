import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', userId)
    .single();
  return data?.agency_id ?? null;
}

// GET /api/agency/pipeline/campaigns — list all campaigns + per-stage lead counts
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const svc = createServiceClientWithoutCookies();

  const { data: campaigns, error } = await svc
    .from('pipeline_campaigns')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach per-stage counts for each campaign
  const enriched = await Promise.all((campaigns ?? []).map(async (c) => {
    const { data: counts } = await svc
      .from('pipeline_leads')
      .select('stage')
      .eq('campaign_id', c.id);

    const stageCounts: Record<string, number> = {};
    for (const row of counts ?? []) {
      stageCounts[row.stage] = (stageCounts[row.stage] ?? 0) + 1;
    }
    return { ...c, stage_counts: stageCounts };
  }));

  return NextResponse.json({ campaigns: enriched });
}

// POST /api/agency/pipeline/campaigns — create a new campaign
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const { name, target_industry, target_role, target_company_size, target_location, target_pain_points, value_prop } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();
  const { data: campaign, error } = await svc
    .from('pipeline_campaigns')
    .insert({
      agency_id: agencyId,
      name: name.trim(),
      target_industry,
      target_role,
      target_company_size,
      target_location,
      target_pain_points,
      value_prop,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ campaign }, { status: 201 });
}
