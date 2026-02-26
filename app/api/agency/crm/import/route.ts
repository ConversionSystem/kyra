import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { importFromGHL, importFromCsv } from '@/lib/crm/import';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();

  if (body.source === 'ghl') {
    const result = await importFromGHL(agencyId);
    return NextResponse.json(result);
  }

  if (body.source === 'csv' && Array.isArray(body.rows)) {
    const result = await importFromCsv(agencyId, body.rows);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'source must be "ghl" or "csv" (with rows array)' }, { status: 400 });
}
