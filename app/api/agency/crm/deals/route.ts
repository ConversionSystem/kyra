import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getDeals, createDeal, getDealStats } from '@/lib/crm/deals';

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

  const url = req.nextUrl;

  // If ?stats=true, return aggregate stats
  if (url.searchParams.get('stats') === 'true') {
    const stats = await getDealStats(agencyId);
    return NextResponse.json(stats);
  }

  const deals = await getDeals(agencyId, {
    stage: url.searchParams.get('stage') || undefined,
    contactId: url.searchParams.get('contactId') || undefined,
    clientId: url.searchParams.get('clientId') || undefined,
    search: url.searchParams.get('search') || undefined,
  });

  return NextResponse.json({ deals });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: 'Deal name required' }, { status: 400 });

  const deal = await createDeal(agencyId, body, user.email || undefined);
  if (!deal) return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });

  return NextResponse.json(deal, { status: 201 });
}
