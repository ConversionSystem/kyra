import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];
const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'https://provisioner.gw.kyra.conversionsystem.com';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET || 'kyra-provisioner-2026';

async function requireMaster() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) return null;
  return user;
}

// PATCH — update plan, account_type, name
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireMaster();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const admin = createServiceClientWithoutCookies();
  const body = await req.json();
  const { plan, account_type, name } = body;

  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (plan) updates.plan = plan;

  if (account_type) {
    const { data: ag } = await admin.from('agencies').select('settings').eq('id', id).single();
    updates.settings = { ...(ag?.settings ?? {}), account_type };
    if (account_type === 'solo' && !ag?.settings?.solo_client_id) {
      (updates.settings as Record<string, unknown>).solo_client_id = id;
    }
    if (account_type === 'agency') {
      delete (updates.settings as Record<string, unknown>).solo_client_id;
    }
  }

  const { data, error } = await admin
    .from('agencies')
    .update(updates)
    .eq('id', id)
    .select('id, name, plan, settings')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// DELETE — full account deletion
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireMaster();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: agencyId } = await params;
  const admin = createServiceClientWithoutCookies();
  const errors: string[] = [];

  const { data: agency } = await admin
    .from('agencies')
    .select('owner_id, settings')
    .eq('id', agencyId)
    .single();

  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 });

  const { data: clients } = await admin
    .from('agency_clients')
    .select('id, gateway_url')
    .eq('agency_id', agencyId);

  const clientIds = [
    ...(clients ?? []).map((c: { id: string; gateway_url: string | null }) => c.id),
    agency.settings?.solo_client_id ?? agencyId,
  ];
  const uniqueIds = [...new Set(clientIds)];

  for (const cid of uniqueIds) {
    try {
      await fetch(`${PROVISIONER_URL}/containers/${cid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${PROVISIONER_SECRET}` },
      });
    } catch (e) {
      errors.push(`Container ${cid}: ${String(e)}`);
    }
  }

  await admin.from('agency_clients').delete().eq('agency_id', agencyId);
  await admin.from('agency_credits').delete().eq('agency_id', agencyId);
  await admin.from('agency_members').delete().eq('agency_id', agencyId);
  await admin.from('agencies').delete().eq('id', agencyId);

  if (agency.owner_id) {
    const { error: authErr } = await admin.auth.admin.deleteUser(agency.owner_id);
    if (authErr) errors.push(`Auth user: ${authErr.message}`);
  }

  return NextResponse.json({ ok: true, errors });
}
