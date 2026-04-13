import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClient } from '@/lib/agency/queries';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agency/clients/[id]/seo/nap-status
 * Returns NAP audit results from the normalized seo_nap_audits table.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const client = await getAgencyClient(id);
  if (!client || client.agency_id !== result.agency.id) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const service = createServiceClientWithoutCookies();

  // Fetch latest NAP audits
  const { data: audits } = await service
    .from('seo_nap_audits')
    .select('*')
    .eq('client_id', id)
    .order('audited_at', { ascending: false })
    .limit(100);

  // Deduplicate: keep latest audit per directory
  const latestByDirectory = new Map<string, typeof audits extends (infer T)[] | null ? T : never>();
  for (const audit of (audits || [])) {
    if (!latestByDirectory.has(audit.directory)) {
      latestByDirectory.set(audit.directory, audit);
    }
  }

  const latestAudits = Array.from(latestByDirectory.values());
  const matchCount = latestAudits.filter(a => a.status === 'match').length;
  const mismatchCount = latestAudits.filter(a => a.status === 'mismatch').length;
  const notFoundCount = latestAudits.filter(a => a.status === 'not_found').length;
  const pendingCount = latestAudits.filter(a => a.status === 'pending').length;

  return NextResponse.json({
    audits: latestAudits,
    all_audits: audits || [],
    stats: {
      total_directories: latestAudits.length,
      match: matchCount,
      mismatch: mismatchCount,
      not_found: notFoundCount,
      pending: pendingCount,
    },
  });
}
