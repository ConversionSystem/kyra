import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/agency/clients/[id]/ghl/audit
 * Paginated audit log for a specific client.
 * Query params: page (default 1), limit (default 50), category, risk, status
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();
  const url = new URL(request.url);

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
  const category = url.searchParams.get('category');
  const risk = url.searchParams.get('risk');
  const status = url.searchParams.get('status');

  let query = supabase
    .from('ghl_action_log')
    .select('*', { count: 'exact' })
    .eq('client_id', id)
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) query = query.eq('action_category', category);
  if (risk) query = query.eq('risk_level', risk);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
}
