import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getCommandFeed } from '@/lib/crm/activities';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const agencyId = await getAgencyId(user.id);
    if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

    const clientId = req.nextUrl.searchParams.get('clientId') || undefined;
    const feed = await getCommandFeed(agencyId, clientId);
    return NextResponse.json(feed);
  } catch (err) {
    console.error('[crm/feed] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
