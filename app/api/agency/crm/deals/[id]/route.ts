import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getDealById, updateDeal, moveDealStage, deleteDeal } from '@/lib/crm/deals';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { id } = await params;
  const deal = await getDealById(agencyId, id);
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { id } = await params;
  const body = await req.json();

  // If moving stage, use moveDealStage for activity logging
  if (body.stage && Object.keys(body).length === 1) {
    const deal = await moveDealStage(agencyId, id, body.stage, user.email || undefined);
    if (!deal) return NextResponse.json({ error: 'Move failed' }, { status: 500 });
    return NextResponse.json(deal);
  }

  const updated = await updateDeal(agencyId, id, body);
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { id } = await params;
  const ok = await deleteDeal(agencyId, id);
  if (!ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
