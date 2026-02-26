import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logActivity, getTimeline, getRecentActivities, resolveActivity } from '@/lib/crm/activities';

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

  const contactId = req.nextUrl.searchParams.get('contactId');
  const limit = Number(req.nextUrl.searchParams.get('limit')) || 20;

  if (contactId) {
    const timeline = await getTimeline(agencyId, contactId, limit);
    return NextResponse.json({ activities: timeline });
  }

  const activities = await getRecentActivities(agencyId, limit);
  return NextResponse.json({ activities });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  if (!body.type) return NextResponse.json({ error: 'Activity type required' }, { status: 400 });

  const activity = await logActivity(agencyId, {
    ...body,
    actor: body.actor || 'human',
    actor_name: body.actor_name || user.email,
  });

  if (!activity) return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  return NextResponse.json(activity, { status: 201 });
}

// PATCH — resolve activity (dismiss from command feed)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { activity_id } = await req.json();
  if (!activity_id) return NextResponse.json({ error: 'activity_id required' }, { status: 400 });

  const ok = await resolveActivity(agencyId, activity_id);
  return NextResponse.json({ ok });
}
