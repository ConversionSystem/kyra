import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId') ?? '';
  const search = req.nextUrl.searchParams.get('search') ?? '';
  const supabase = createServiceClientWithoutCookies();

  if (clientId === 'list' || search) {
    const q = search || '';
    const { data: agencies } = q
      ? await supabase.from('agencies').select('id, name').ilike('name', `%${q}%`).limit(10)
      : await supabase.from('agencies').select('id, name').limit(10);
    const { data: clients } = q
      ? await supabase.from('agency_clients').select('id, name, agency_id').ilike('name', `%${q}%`).limit(10)
      : await supabase.from('agency_clients').select('id, name, agency_id').limit(10);
    return NextResponse.json({ agencies, clients });
  }

  const { data: clientRow, error: clientErr } = await supabase
    .from('agency_clients').select('id, name, agency_id').eq('id', clientId).maybeSingle();
  const { data: agencyRow, error: agencyErr } = await supabase
    .from('agencies').select('id, name').eq('id', clientId).maybeSingle();

  return NextResponse.json({ clientId, clientRow, clientErr: clientErr?.message ?? null, agencyRow, agencyErr: agencyErr?.message ?? null });
}
