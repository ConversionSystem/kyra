import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAllCompanyIntelligence, getCompanyIntelligence } from '@/lib/crm/cross-contact';
import { forecastDeals } from '@/lib/crm/intelligence';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

// GET /api/agency/crm/intelligence?type=companies|forecast|company&companyId=xxx
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const type = req.nextUrl.searchParams.get('type') || 'companies';

  if (type === 'forecast') {
    const result = await forecastDeals(agencyId);
    return NextResponse.json(result);
  }

  if (type === 'company') {
    const companyId = req.nextUrl.searchParams.get('companyId');
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const intel = await getCompanyIntelligence(agencyId, companyId);
    if (!intel) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    return NextResponse.json(intel);
  }

  // Default: all companies
  const intel = await getAllCompanyIntelligence(agencyId);
  return NextResponse.json({ companies: intel });
}
