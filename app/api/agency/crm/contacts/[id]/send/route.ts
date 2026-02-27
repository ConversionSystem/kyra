/**
 * Send email/SMS from contact detail page.
 * Uses GHL API if pipeline integration exists, otherwise returns error.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { logActivity } from '@/lib/crm/activities';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { id: contactId } = await params;
  const body = await req.json();
  const { channel, message, subject } = body as { channel: 'sms' | 'email'; message: string; subject?: string };

  if (!channel || !message?.trim()) {
    return NextResponse.json({ error: 'channel and message required' }, { status: 400 });
  }

  const svc = createServiceClientWithoutCookies();

  // Get contact
  const { data: contact } = await svc
    .from('crm_contacts')
    .select('*')
    .eq('id', contactId)
    .eq('agency_id', agencyId)
    .single();

  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  // Get GHL integration
  const { data: integration } = await svc
    .from('pipeline_integrations')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('provider', 'ghl')
    .eq('enabled', true)
    .limit(1)
    .single();

  if (!integration && channel === 'email' && contact.email) {
    // No GHL — try Resend fallback for email
    try {
      const { sendEmailViaResend } = await import('@/lib/email/sender');
      const result = await sendEmailViaResend({
        to: contact.email,
        subject: subject || 'Message from your team',
        body: message.trim(),
      });

      if (result.ok) {
        await logActivity(agencyId, {
          contact_id: contactId,
          type: 'email',
          subject: subject || 'Email sent',
          body: message.trim(),
          direction: 'outbound',
          channel: 'resend',
          actor: 'human',
          actor_name: user.email || undefined,
          metadata: { provider: 'resend', message_id: result.messageId },
        });
        return NextResponse.json({ ok: true, channel: 'email', provider: 'resend' });
      }
      // If Resend also fails, fall through to error
    } catch {}
  }

  if (!integration) {
    return NextResponse.json({
      error: 'No GHL integration connected. Connect GHL in Pipeline → Integrations, or add RESEND_API_KEY for email.',
    }, { status: 422 });
  }

  const token = integration.access_token;
  const locationId = integration.config?.location_id;

  if (!token) {
    return NextResponse.json({ error: 'GHL token missing' }, { status: 422 });
  }

  try {
    if (channel === 'sms') {
      if (!contact.phone) {
        return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 });
      }

      // Find or create GHL contact
      const ghlContactId = await findOrCreateGhlContact(token, locationId, contact);
      if (!ghlContactId) {
        return NextResponse.json({ error: 'Could not create GHL contact' }, { status: 500 });
      }

      // Send SMS via GHL conversations API
      const sendRes = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-04-15',
        },
        body: JSON.stringify({
          type: 'SMS',
          contactId: ghlContactId,
          message: message.trim(),
        }),
      });

      if (!sendRes.ok) {
        const err = await sendRes.text();
        console.error('[crm/send] GHL SMS error:', err);
        return NextResponse.json({ error: 'Failed to send SMS via GHL' }, { status: 500 });
      }

      // Log activity
      await logActivity(agencyId, {
        contact_id: contactId,
        type: 'sms',
        subject: 'SMS sent',
        body: message.trim(),
        direction: 'outbound',
        channel: 'ghl',
        actor: 'human',
        actor_name: user.email || undefined,
        metadata: { ghl_contact_id: ghlContactId },
      });

      return NextResponse.json({ ok: true, channel: 'sms' });

    } else if (channel === 'email') {
      if (!contact.email) {
        return NextResponse.json({ error: 'Contact has no email' }, { status: 400 });
      }

      const ghlContactId = await findOrCreateGhlContact(token, locationId, contact);
      if (!ghlContactId) {
        return NextResponse.json({ error: 'Could not create GHL contact' }, { status: 500 });
      }

      const sendRes = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-04-15',
        },
        body: JSON.stringify({
          type: 'Email',
          contactId: ghlContactId,
          message: message.trim(),
          subject: subject || 'Message from your team',
        }),
      });

      if (!sendRes.ok) {
        const err = await sendRes.text();
        console.error('[crm/send] GHL email error:', err);
        return NextResponse.json({ error: 'Failed to send email via GHL' }, { status: 500 });
      }

      await logActivity(agencyId, {
        contact_id: contactId,
        type: 'email',
        subject: subject || 'Email sent',
        body: message.trim(),
        direction: 'outbound',
        channel: 'ghl',
        actor: 'human',
        actor_name: user.email || undefined,
        metadata: { ghl_contact_id: ghlContactId },
      });

      return NextResponse.json({ ok: true, channel: 'email' });
    }

    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
  } catch (err) {
    console.error('[crm/send] Error:', err);
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}

async function findOrCreateGhlContact(
  token: string,
  locationId: string | undefined,
  contact: Record<string, unknown>,
): Promise<string | null> {
  try {
    // Search by email or phone
    const searchParams = new URLSearchParams();
    if (locationId) searchParams.set('locationId', locationId);
    if (contact.email) searchParams.set('email', contact.email as string);
    else if (contact.phone) searchParams.set('phone', contact.phone as string);

    const searchRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-04-15',
        },
      },
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.contacts?.length > 0) return data.contacts[0].id;
    }

    // Create new
    const createRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Version': '2021-04-15',
      },
      body: JSON.stringify({
        locationId,
        firstName: contact.first_name || '',
        lastName: contact.last_name || '',
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        source: 'Kyra CRM',
      }),
    });

    if (createRes.ok) {
      const data = await createRes.json();
      return data.contact?.id || null;
    }

    return null;
  } catch (err) {
    console.error('[crm/send] findOrCreateGhlContact error:', err);
    return null;
  }
}
