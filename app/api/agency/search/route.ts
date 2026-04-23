import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';

/**
 * Agency Search API — returns clients for command palette
 *
 * GET /api/agency/search?q=<optional query>
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await getAgencyForUser(user.id);
  if (!result) {
    return NextResponse.json({ error: 'No agency' }, { status: 403 });
  }

  const { agency } = result;
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase().trim() || '';

  // Fetch all clients (agencies typically have <50 clients, so this is fine)
  let query = supabase
    .from('agency_clients')
    .select('id, name, industry, gateway_status')
    .eq('agency_id', agency.id)
    .order('name', { ascending: true })
    .limit(50);

  if (q) {
    query = query.or(`name.ilike.%${q}%,industry.ilike.%${q}%`);
  }

  const { data: clients, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  return NextResponse.json({
    clients: (clients || []).map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      gateway_status: c.gateway_status,
    })),
  });
}
