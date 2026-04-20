import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const MASTER_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com'];
const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'https://provisioner.gw.kyra.conversionsystem.com';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET;

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
    const existingSettings = (ag?.settings ?? {}) as Record<string, unknown>;
    const newSettings: Record<string, unknown> = { ...existingSettings, account_type };
    if (account_type === 'solo' && !existingSettings.solo_client_id) {
      newSettings.solo_client_id = id;
    }
    if (account_type === 'agency') {
      delete newSettings.solo_client_id;
    }
    updates.settings = newSettings;
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

// Helper: delete container with timeout (best-effort, never blocks)
async function deleteContainer(cid: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s max
    const res = await fetch(`${PROVISIONER_URL}/containers/${cid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${PROVISIONER_SECRET}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok && res.status !== 404) {
      return `Container ${cid}: HTTP ${res.status}`;
    }
    return null;
  } catch (e) {
    const msg = String(e);
    // Aborted = timeout, not a real error for our purposes
    if (msg.includes('abort')) return `Container ${cid}: timeout (will be cleaned up later)`;
    return `Container ${cid}: ${msg}`;
  }
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

  // ── 1. Collect container IDs BEFORE deleting DB rows ─────────────────
  const { data: clients } = await admin
    .from('agency_clients')
    .select('id')
    .eq('agency_id', agencyId);

  const settings = (agency.settings ?? {}) as Record<string, unknown>;
  const containerIds: string[] = (clients ?? []).map((c: { id: string }) => c.id);
  if (settings.solo_client_id && typeof settings.solo_client_id === 'string') {
    containerIds.push(settings.solo_client_id);
  }
  containerIds.push(agencyId);
  const uniqueIds = [...new Set(containerIds)];

  // ── 2. Delete DB records in FK-safe order ───────────────────────────────
  // Tables with foreign keys to agency_clients / agencies must be deleted first.
  const dbErrors: string[] = [];

  // Child tables first (FK → agency_clients or agencies)
  for (const table of [
    'client_sites', 'client_conversations', 'pipeline_leads', 'credit_transactions',
    'crm_contacts', 'email_nurture_queue', 'ghl_action_proposals', 'ghl_action_log', 'build_requests',
  ]) {
    const { error } = await admin.from(table).delete().eq('agency_id', agencyId);
    if (error && !error.message.includes('does not exist')) {
      dbErrors.push(`${table}: ${error.message}`);
    }
  }

  // agency_referrals: FK on referrer_agency_id or referred_agency_id
  for (const col of ['referrer_agency_id', 'referred_agency_id']) {
    const { error } = await admin.from('agency_referrals').delete().eq(col, agencyId);
    if (error && !error.message.includes('does not exist')) {
      dbErrors.push(`agency_referrals(${col}): ${error.message}`);
    }
  }

  // Also delete client_sites by client_id (some may reference client_id not agency_id)
  for (const cid of uniqueIds) {
    await admin.from('client_sites').delete().eq('client_id', cid);
  }

  // Now safe to delete agency_clients
  const r1 = await admin.from('agency_clients').delete().eq('agency_id', agencyId);
  if (r1.error) dbErrors.push(`clients: ${r1.error.message}`);

  const r2 = await admin.from('agency_credits').delete().eq('agency_id', agencyId);
  if (r2.error) dbErrors.push(`credits: ${r2.error.message}`);

  const r3 = await admin.from('agency_members').delete().eq('agency_id', agencyId);
  if (r3.error) dbErrors.push(`members: ${r3.error.message}`);

  // Finally delete the agency itself
  const r4 = await admin.from('agencies').delete().eq('id', agencyId);
  if (r4.error) dbErrors.push(`agency: ${r4.error.message}`);

  if (dbErrors.length > 0) {
    errors.push(...dbErrors.map(e => `DB: ${e}`));
  }

  // ── 3. Delete auth user ────────────────────────────────────────────────
  if (agency.owner_id) {
    const { error: authErr } = await admin.auth.admin.deleteUser(agency.owner_id);
    if (authErr) errors.push(`Auth user: ${authErr.message}`);
  }

  // ── 4. Delete containers on VPS (always attempt, even if DB had errors) ─
  const containerResults = await Promise.all(uniqueIds.map(deleteContainer));
  for (const err of containerResults) {
    if (err) errors.push(err);
  }

  return NextResponse.json({
    ok: dbErrors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }, { status: dbErrors.length > 0 ? 207 : 200 });
}
