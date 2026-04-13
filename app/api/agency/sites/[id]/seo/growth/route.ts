import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { generateGrowthSuggestions } from '@/lib/seo/growth-engine-v2';

export const dynamic = 'force-dynamic';

interface PageParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: PageParams,
) {
  const { id: siteId } = await params;

  const authResult = await requireAgencyAdmin();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error.message }, { status: authResult.error.status });
  }

  const { agency } = authResult.data;
  const service = createServiceClientWithoutCookies();

  // Verify site belongs to this agency
  const { data: site } = await service
    .from('client_sites')
    .select('id, agency_id')
    .eq('id', siteId)
    .eq('agency_id', agency.id)
    .single();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const suggestions = await generateGrowthSuggestions(siteId);

  return NextResponse.json({ site_id: siteId, suggestions });
}
