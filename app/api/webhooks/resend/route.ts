import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { unsubscribeContact } from '@/lib/email/marketing';

/**
 * POST /api/webhooks/resend
 * Resend webhook handler for tracking email events.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, data } = body;

  if (!type || !data) {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Map Resend event types to our event names
  const eventMap: Record<string, string> = {
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
  };

  const event = eventMap[type];
  if (!event) {
    // Event type we don't track
    return NextResponse.json({ ok: true });
  }

  const resendEmailId = data.email_id;
  const recipientEmail = data.to?.[0] || data.email;

  if (!resendEmailId) {
    return NextResponse.json({ ok: true });
  }

  // Find the analytics record by resend_email_id to get campaign_id
  const { data: existing } = await supabase
    .from('email_analytics')
    .select('campaign_id, contact_id')
    .eq('resend_email_id', resendEmailId)
    .eq('event', 'sent')
    .limit(1)
    .single();

  if (!existing) {
    // Not from a campaign we track
    return NextResponse.json({ ok: true });
  }

  // Insert analytics event
  await supabase.from('email_analytics').insert({
    campaign_id: existing.campaign_id,
    contact_id: existing.contact_id,
    email: recipientEmail || '',
    event,
    resend_email_id: resendEmailId,
    metadata: data,
  });

  // Update campaign counters
  const counterField = `total_${event}`;
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', existing.campaign_id)
    .single();

  if (campaign) {
    const current = (campaign as unknown as Record<string, number>)[counterField] || 0;
    await supabase
      .from('email_campaigns')
      .update({ [counterField]: current + 1 })
      .eq('id', existing.campaign_id);
  }

  // Handle bounces — mark contact as bounced
  if (event === 'bounced' && recipientEmail) {
    await supabase
      .from('email_contacts')
      .update({ status: 'bounced' })
      .eq('id', existing.contact_id);
  }

  // Handle complaints — unsubscribe the contact
  if (event === 'complained' && recipientEmail) {
    // Get agency_id from campaign
    const { data: camp } = await supabase
      .from('email_campaigns')
      .select('agency_id')
      .eq('id', existing.campaign_id)
      .single();

    if (camp) {
      await unsubscribeContact(camp.agency_id, recipientEmail, 'complaint', existing.campaign_id);
    }
  }

  return NextResponse.json({ ok: true });
}
