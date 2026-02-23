// POST /api/agency/sales-pipeline — save pipeline state to agency settings JSONB

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();
  if (!member) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { pipeline } = await req.json();

  const svc = createServiceClientWithoutCookies();
  // Merge into existing settings JSONB
  const { data: agency } = await svc
    .from('agencies')
    .select('settings')
    .eq('id', member.agency_id)
    .single();

  const currentSettings = (agency?.settings as Record<string, unknown>) ?? {};
  await svc
    .from('agencies')
    .update({ settings: { ...currentSettings, sales_pipeline: pipeline } })
    .eq('id', member.agency_id);

  return NextResponse.json({ ok: true });
}
