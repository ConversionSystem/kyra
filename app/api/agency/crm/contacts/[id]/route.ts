import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getContactById, updateContact, deleteContact } from '@/lib/crm/contacts';
import { getTimeline } from '@/lib/crm/activities';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

// GET /api/agency/crm/contacts/[id] — Contact detail + timeline
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { id } = await params;
  const contact = await getContactById(agencyId, id);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const activities = await getTimeline(agencyId, id, 50);

  // Get deals for this contact
  const svc = createServiceClientWithoutCookies();
  const { data: deals } = await svc
    .from('crm_deals')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('contact_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ ...contact, activities, deals: deals || [] });
}

// PATCH /api/agency/crm/contacts/[id] — Update contact
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { id } = await params;
  const body = await req.json();
  const updated = await updateContact(agencyId, id, body);
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  return NextResponse.json(updated);
}

// DELETE /api/agency/crm/contacts/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { id } = await params;
  const ok = await deleteContact(agencyId, id);
  if (!ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
