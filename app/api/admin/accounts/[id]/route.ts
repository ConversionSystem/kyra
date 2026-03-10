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
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireMaster();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createServiceClientWithoutCookies();
  const body = await req.json();
  const { plan, account_type, name } = body;

  // Build update object
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (plan) updates.plan = plan;

  if (account_type) {
    // Fetch current settings to merge
    const { data: ag } = await admin.from('agencies').select('settings').eq('id', params.id).single();
    updates.settings = { ...(ag?.settings ?? {}), account_type };
    // If converting to solo, ensure solo_client_id is set
    if (account_type === 'solo' && !ag?.settings?.solo_client_id) {
      (updates.settings as Record<string, unknown>).solo_client_id = params.id;
    }
    // If converting to agency, remove solo_client_id
    if (account_type === 'agency') {
      delete (updates.settings as Record<string, unknown>).solo_client_id;
    }
  }

  const { data, error } = await admin
    .from('agencies')
    .update(updates)
    .eq('id', params.id)
    .select('id, name, plan, settings')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// DELETE — full account deletion
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireMaster();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createServiceClientWithoutCookies();
  const agencyId = params.id;
  const errors: string[] = [];

  // 1. Get agency + owner
  const { data: agency } = await admin
    .from('agencies')
    .select('owner_id, settings')
    .eq('id', agencyId)
    .single();

  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 });

  // 2. Get all client containers to stop
  const { data: clients } = await admin
    .from('agency_clients')
    .select('id, gateway_url')
    .eq('agency_id', agencyId);

  // 3. Stop & remove containers via provisioner
  const clientIds = [
    ...(clients ?? []).map(c => c.id),
    // Also try agency's own container (solo_client_id or agencyId itself)
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

  // 4. Delete DB rows
  await admin.from('agency_clients').delete().eq('agency_id', agencyId);
  await admin.from('agency_credits').delete().eq('agency_id', agencyId);
  await admin.from('agency_members').delete().eq('agency_id', agencyId);
  await admin.from('agencies').delete().eq('id', agencyId);

  // 5. Delete auth user
  if (agency.owner_id) {
    const { error: authErr } = await admin.auth.admin.deleteUser(agency.owner_id);
    if (authErr) errors.push(`Auth user: ${authErr.message}`);
  }

  return NextResponse.json({ ok: true, errors });
}
