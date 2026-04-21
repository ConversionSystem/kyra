import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember, requireAgencyAdmin, requireAgencyOwner } from '@/lib/agency/middleware';
import { markOnboardingStep } from '@/lib/onboarding/tracker';
import { validateSettingsPatch } from '@/lib/agency/settings-validator';

/**
 * GET /api/agency/settings
 * Return agency settings: name, slug, settings JSONB, and members list.
 */
export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  // Fetch members with user email
  const { data: members, error: membersError } = await supabase
    .from('agency_members')
    .select('*, user:user_id(id, email)')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: true });

  if (membersError) {
    console.error('Failed to fetch members:', membersError);
  }

  return NextResponse.json({
    id: agency.id,
    name: agency.name,
    slug: agency.slug,
    plan: agency.plan,
    settings: agency.settings ?? {},
    members: members ?? [],
  });
}

/**
 * PATCH /api/agency/settings
 * Update agency name and/or settings JSONB. Requires admin+ role.
 * Settings JSONB is validated — only known keys are merged.
 */
export async function PATCH(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  // Parse body
  let body: { name?: string; settings?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  // Update name
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be 2-100 characters' },
        { status: 400 }
      );
    }
    updates.name = name;
  }

  // Update settings JSONB (validate → merge)
  if (body.settings !== undefined && body.settings !== null && typeof body.settings === 'object') {
    const { updates: validatedSettings, error: validationError } = validateSettingsPatch(
      body.settings as Record<string, unknown>,
      agency.plan,
    );
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const currentSettings = (agency.settings ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...currentSettings };
    for (const [key, value] of Object.entries(validatedSettings)) {
      if (value === undefined) {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }
    updates.settings = merged;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const supabase = await createClient();
  const { data: updated, error: updateError } = await supabase
    .from('agencies')
    .update(updates)
    .eq('id', agency.id)
    .select()
    .single();

  if (updateError) {
    console.error('Failed to update agency settings:', updateError);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }

  // Fire-and-forget: mark onboarding step
  void markOnboardingStep(agency.id, 'profile_completed');

  return NextResponse.json(updated);
}

/**
 * DELETE /api/agency/settings
 * Delete the current user's agency. Requires owner role.
 * Deletes: client_sites, agency_clients, agency_credits, agency_members, crm_contacts, then agencies.
 * Also cleans up containers via provisioner (best-effort).
 */
export async function DELETE() {
  const result = await requireAgencyOwner();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  const admin = createServiceClientWithoutCookies();
  const agencyId = agency.id;
  const errors: string[] = [];

  // Collect client IDs for container cleanup
  const { data: clients } = await admin.from('agency_clients').select('id').eq('agency_id', agencyId);
  const settings = (agency.settings ?? {}) as Record<string, unknown>;
  const containerIds: string[] = (clients ?? []).map((c: { id: string }) => c.id);
  if (settings.solo_client_id && typeof settings.solo_client_id === 'string') {
    containerIds.push(settings.solo_client_id);
  }
  containerIds.push(agencyId);
  const uniqueContainerIds = [...new Set(containerIds)];

  // Delete DB records in FK-safe order
  for (const table of ['client_sites', 'client_conversations', 'pipeline_leads', 'credit_transactions', 'crm_contacts']) {
    const { error } = await admin.from(table).delete().eq('agency_id', agencyId);
    if (error && !error.message.includes('does not exist')) {
      errors.push(`${table}: ${error.message}`);
    }
  }

  // Delete client_sites by client_id too
  for (const cid of uniqueContainerIds) {
    await admin.from('client_sites').delete().eq('client_id', cid);
  }

  const r1 = await admin.from('agency_clients').delete().eq('agency_id', agencyId);
  if (r1.error) errors.push(`clients: ${r1.error.message}`);

  const r2 = await admin.from('agency_credits').delete().eq('agency_id', agencyId);
  if (r2.error) errors.push(`credits: ${r2.error.message}`);

  const r3 = await admin.from('agency_members').delete().eq('agency_id', agencyId);
  if (r3.error) errors.push(`members: ${r3.error.message}`);

  const r4 = await admin.from('agencies').delete().eq('id', agencyId);
  if (r4.error) {
    return NextResponse.json({ error: `Failed to delete agency: ${r4.error.message}` }, { status: 500 });
  }

  // Delete auth user (the owner)
  if (agency.owner_id) {
    const { error: authErr } = await admin.auth.admin.deleteUser(agency.owner_id);
    if (authErr) errors.push(`auth: ${authErr.message}`);
  }

  // Container cleanup (best-effort with timeout)
  const provisionerUrl = process.env.OVH_PROVISIONER_URL || 'https://provisioner.gw.kyra.conversionsystem.com';
  const provisionerSecret = process.env.OVH_PROVISIONER_SECRET;
  for (const cid of uniqueContainerIds) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(`${provisionerUrl}/containers/${cid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${provisionerSecret}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch { /* best-effort */ }
  }

  return NextResponse.json({ ok: true, errors: errors.length > 0 ? errors : undefined });
}
