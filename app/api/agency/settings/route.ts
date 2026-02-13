import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember, requireAgencyAdmin } from '@/lib/agency/middleware';

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

  // Update settings JSONB (merge with existing)
  if (body.settings !== undefined && typeof body.settings === 'object') {
    const currentSettings = (agency.settings ?? {}) as Record<string, unknown>;
    // Merge: new values override, undefined values are stripped
    const merged: Record<string, unknown> = { ...currentSettings };
    for (const [key, value] of Object.entries(body.settings)) {
      if (value === undefined || value === null || value === '') {
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

  return NextResponse.json(updated);
}
