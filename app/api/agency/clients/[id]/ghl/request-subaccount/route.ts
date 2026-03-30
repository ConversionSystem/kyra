// ============================================================================
// POST /api/agency/clients/[id]/ghl/request-subaccount
//
// Submits a manual GHL sub-account creation request.
// Saves to DB, sends notification email to support@conversionsystem.com,
// and sends a confirmation email to the requester.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { sendEmailViaResend } from '@/lib/email/sender';

export const dynamic = 'force-dynamic';

const SUPPORT_EMAIL = 'support@conversionsystem.com';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency, user } = result.data;

  // Parse body
  let body: {
    businessName?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    businessAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    timezone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate required fields
  if (!body.businessName?.trim() || !body.contactName?.trim() || !body.contactEmail?.trim()) {
    return NextResponse.json(
      { error: 'Business name, contact name, and contact email are required.' },
      { status: 400 },
    );
  }

  const db = createServiceClientWithoutCookies();

  // Verify client belongs to this agency
  const { data: client, error: clientError } = await db
    .from('agency_clients')
    .select('id, name, agency_id')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Check for duplicate pending request
  const { data: existing } = await db
    .from('ghl_subaccount_requests')
    .select('id, status')
    .eq('client_id', clientId)
    .in('status', ['pending', 'in_progress'])
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'A request for this client is already pending. We\'ll email you when it\'s ready.' },
      { status: 409 },
    );
  }

  // Save request to DB
  const { data: reqRecord, error: insertError } = await db
    .from('ghl_subaccount_requests')
    .insert({
      agency_id: agency.id,
      client_id: clientId,
      business_name: body.businessName.trim(),
      contact_name: body.contactName.trim(),
      contact_email: body.contactEmail.trim().toLowerCase(),
      contact_phone: body.contactPhone?.trim() || null,
      business_address: body.businessAddress?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      country: body.country?.trim() || 'US',
      timezone: body.timezone?.trim() || 'America/New_York',
      status: 'pending',
      requested_by: user.id,
    })
    .select('id')
    .single();

  if (insertError || !reqRecord) {
    console.error('[request-subaccount] DB insert failed:', insertError);
    return NextResponse.json({ error: 'Failed to save request. Please try again.' }, { status: 500 });
  }

  const requestId = reqRecord.id.substring(0, 8).toUpperCase();

  // ── Send internal notification to support ─────────────────────────────────
  const internalHtml = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #4f46e5; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">🟠 New GHL Sub-Account Request</h1>
        <p style="margin: 4px 0 0; opacity: 0.8; font-size: 14px;">Request ID: #${requestId}</p>
      </div>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;"><strong>Agency</strong></td><td style="padding: 8px 0;">${agency.name || agency.id}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Kyra Client</strong></td><td style="padding: 8px 0;">${client.name || clientId}</td></tr>
          <tr><td colspan="2" style="border-top: 1px solid #e5e7eb; padding-top: 16px; padding-bottom: 4px; font-weight: 600; color: #111827;">Sub-Account Details</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Business Name</strong></td><td style="padding: 8px 0;">${body.businessName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Contact Name</strong></td><td style="padding: 8px 0;">${body.contactName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Contact Email</strong></td><td style="padding: 8px 0;"><a href="mailto:${body.contactEmail}">${body.contactEmail}</a></td></tr>
          ${body.contactPhone ? `<tr><td style="padding: 8px 0; color: #6b7280;"><strong>Phone</strong></td><td style="padding: 8px 0;">${body.contactPhone}</td></tr>` : ''}
          ${body.businessAddress ? `<tr><td style="padding: 8px 0; color: #6b7280;"><strong>Address</strong></td><td style="padding: 8px 0;">${body.businessAddress}${body.city ? `, ${body.city}` : ''}${body.state ? `, ${body.state}` : ''} ${body.country || 'US'}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Timezone</strong></td><td style="padding: 8px 0;">${body.timezone || 'America/New_York'}</td></tr>
        </table>
        <div style="margin-top: 24px; padding: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 13px; color: #92400e;">
          <strong>Action needed:</strong> Create this sub-account in GHL, then update the Location ID in Kyra's admin panel or directly in Supabase → <code>ghl_subaccount_requests</code> table → set <code>ghl_location_id</code> and <code>status = completed</code>.
        </div>
      </div>
    </div>
  `;

  await sendEmailViaResend({
    to: SUPPORT_EMAIL,
    subject: `[GHL Request #${requestId}] New sub-account: ${body.businessName}`,
    body: `New GHL sub-account request #${requestId}\n\nBusiness: ${body.businessName}\nContact: ${body.contactName} <${body.contactEmail}>\nPhone: ${body.contactPhone || 'N/A'}\nAddress: ${body.businessAddress || 'N/A'}, ${body.city || ''}, ${body.state || ''} ${body.country || 'US'}\nTimezone: ${body.timezone || 'America/New_York'}\n\nAgency: ${agency.name || agency.id}\nKyra Client: ${client.name || clientId}`,
    html: internalHtml,
    fromName: 'Kyra Platform',
  });

  // ── Send confirmation to requester ────────────────────────────────────────
  const requesterEmail = user.email;
  if (requesterEmail) {
    const confirmHtml = `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4f46e5; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">✅ GHL Sub-Account Request Received</h1>
          <p style="margin: 4px 0 0; opacity: 0.8; font-size: 14px;">Request #${requestId}</p>
        </div>
        <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p style="color: #374151; font-size: 15px;">Hi${body.contactName ? ` ${body.contactName.split(' ')[0]}` : ''},</p>
          <p style="color: #374151; font-size: 15px;">We've received your request to create a GoHighLevel sub-account for <strong>${body.businessName}</strong>. Our team will set it up and connect it to your Kyra dashboard within 1 business day.</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 14px; color: #6b7280;">
            <p style="margin: 0 0 4px;"><strong style="color: #111827;">Request ID:</strong> #${requestId}</p>
            <p style="margin: 0 0 4px;"><strong style="color: #111827;">Business:</strong> ${body.businessName}</p>
            <p style="margin: 0;"><strong style="color: #111827;">Status:</strong> Pending</p>
          </div>
          <p style="color: #374151; font-size: 14px;">Questions? Reply to this email or contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #4f46e5;">${SUPPORT_EMAIL}</a>.</p>
          <p style="color: #374151; font-size: 14px; margin-bottom: 0;">— The Kyra Team</p>
        </div>
      </div>
    `;

    await sendEmailViaResend({
      to: requesterEmail,
      subject: `GHL sub-account request received — ${body.businessName} (#${requestId})`,
      body: `Hi,\n\nWe've received your request to create a GHL sub-account for ${body.businessName} (Request #${requestId}).\n\nWe'll set it up and connect it to your Kyra dashboard within 1 business day.\n\nQuestions? Email ${SUPPORT_EMAIL}.\n\n— The Kyra Team`,
      html: confirmHtml,
      fromName: 'Kyra',
      replyTo: SUPPORT_EMAIL,
    });
  }

  console.log(`[request-subaccount] ✅ Request #${requestId} created for client ${clientId} (${body.businessName})`);

  return NextResponse.json({
    ok: true,
    requestId,
    message: `Request submitted! We'll create your GHL sub-account and connect it within 1 business day. Check your email for confirmation.`,
  });
}
