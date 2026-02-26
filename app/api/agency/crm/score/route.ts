/**
 * POST /api/agency/crm/score — Trigger AI relationship scoring
 * Can be called manually or from cron
 */
import { NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { scoreContacts } from '@/lib/crm/scoring';
import { detectStaleDeals } from '@/lib/crm/stale-deals';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const [scoring, stale] = await Promise.all([
    scoreContacts(agencyId),
    detectStaleDeals(agencyId),
  ]);

  return NextResponse.json({
    scoring,
    stale_deals: stale,
    message: `Scored ${scoring.scored} contacts, found ${stale.stale} stale deals, drafted ${stale.drafted} follow-ups.`,
  });
}
