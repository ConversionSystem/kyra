import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { findDuplicates, mergeContacts } from '@/lib/crm/merge';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  try {
    const groups = await findDuplicates(result.agency.id);
    return NextResponse.json({ groups, total: groups.length });
  } catch {
    return NextResponse.json({ error: 'Failed to find duplicates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const { primary_id, secondary_id, field_overrides } = await req.json();
  if (!primary_id || !secondary_id) {
    return NextResponse.json({ error: 'primary_id and secondary_id required' }, { status: 400 });
  }

  try {
    await mergeContacts(result.agency.id, primary_id, secondary_id, field_overrides);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Merge failed' }, { status: 500 });
  }
}
