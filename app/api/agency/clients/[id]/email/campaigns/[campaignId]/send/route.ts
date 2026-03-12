import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { sendCampaign, getAudienceCount } from '@/lib/email/marketing';

type RouteContext = { params: Promise<{ id: string; campaignId: string }> };

/**
 * POST /api/agency/clients/[id]/email/campaigns/[campaignId]/send
 * Send campaign now or schedule for later.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: clientId, campaignId } = await context.params;
  const result = await requireAgencyAdmin();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: result.error.status });

  const { agency } = result.data;
  const supabase = await createClient();

  // Verify campaign belongs to this client
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('agency_id', agency.id)
    .eq('client_id', clientId)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    return NextResponse.json({ error: 'Campaign must be in draft or scheduled status' }, { status: 400 });
  }

  // Check for recipients
  const audienceCount = await getAudienceCount(agency.id, clientId, campaign.segment_tags);
  if (audienceCount === 0) {
    return NextResponse.json({ error: 'No eligible recipients for this campaign' }, { status: 400 });
  }

  // Check for scheduled send
  const body = await request.json().catch(() => ({}));
  if (body.scheduled_at) {
    await supabase
      .from('email_campaigns')
      .update({ status: 'scheduled', scheduled_at: body.scheduled_at })
      .eq('id', campaignId);
    return NextResponse.json({ scheduled: true, scheduled_at: body.scheduled_at, audience: audienceCount });
  }

  // Send now
  const sendResult = await sendCampaign(campaignId);
  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error }, { status: 500 });
  }

  return NextResponse.json({ sent: true, total_sent: sendResult.sent });
}
