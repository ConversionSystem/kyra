/**
 * GET /api/agency/pipeline/follow-ups?campaign_id=...&lead_id=...
 * Get follow-up stats for a campaign or details for a specific lead.
 *
 * POST /api/agency/pipeline/follow-ups
 * Cancel follow-ups for specific leads or reschedule.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getFollowUpStats, getLeadFollowUps, cancelFollowUps } from '@/lib/pipeline/follow-up-engine';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id');
  const leadId = searchParams.get('lead_id');

  if (leadId) {
    const followUps = await getLeadFollowUps(leadId);
    return NextResponse.json({ follow_ups: followUps });
  }

  if (campaignId) {
    const stats = await getFollowUpStats(campaignId);
    return NextResponse.json({ stats });
  }

  return NextResponse.json({ error: 'campaign_id or lead_id required' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { action, lead_ids } = await req.json();

  if (action === 'cancel' && lead_ids?.length) {
    let cancelled = 0;
    for (const leadId of lead_ids) {
      cancelled += await cancelFollowUps(leadId);
    }
    return NextResponse.json({ cancelled });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
