import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId') ?? '';
  const supabase = createServiceClientWithoutCookies();

  if (clientId === 'list') {
    // List first 5 agencies
    const { data: agencies } = await supabase
      .from('agencies')
      .select('id, name')
      .limit(5);
    // List first 5 clients  
    const { data: clients } = await supabase
      .from('agency_clients')
      .select('id, name, agency_id')
      .limit(5);
    return NextResponse.json({ agencies, clients });
  }

  const { data: clientRow, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, name, agency_id')
    .eq('id', clientId)
    .maybeSingle();

  const { data: agencyRow, error: agencyErr } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('id', clientId)
    .maybeSingle();

  return NextResponse.json({
    clientId,
    clientRow,
    clientErr: clientErr?.message ?? null,
    agencyRow,
    agencyErr: agencyErr?.message ?? null,
  });
}
