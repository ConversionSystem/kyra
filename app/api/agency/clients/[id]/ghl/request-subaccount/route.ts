// ============================================================================
// POST /api/agency/clients/[id]/ghl/request-subaccount
//
// Submits a manual GHL sub-account creation request.
// On submission:
//   1. Saves to ghl_subaccount_requests table
//   2. Upserts contact into Kyra CRM (ConversionSystem agency)
//   3. Pushes contact to GHL Conversion System sub-account (y1BFVhXMDNUPlbPxEpSA)
//   4. Sends full details to support@conversionsystem.com
//   5. Sends confirmation to the requester
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { sendPlatformEmail } from '@/lib/email/ghl-platform-sender';

export const dynamic = 'force-dynamic';

const SUPPORT_EMAIL = 'support@conversionsystem.com';

// Kyra's own Conversion System GHL sub-account
const CS_GHL_LOCATION_ID = 'y1BFVhXMDNUPlbPxEpSA';
const CS_AGENCY_ID = '1511e077-77ef-4c47-81fd-06a3bc9f1dbb';
const CS_CLIENT_ID = '307c9548-2782-4c12-8122-0f0d132bd4dd';

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

// ── Helper: push contact to GHL ───────────────────────────────────────────────

async function syncToGHL(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName?: string;
  city?: string;
  state?: string;
  requestId: string;
  agencyName: string;
  kyraClientName: string;
}): Promise<{ contactId: string | null; error?: string }> {
  const token = process.env.GHL_PLATFORM_TOKEN;
  if (!token) return { contactId: null, error: 'GHL_PLATFORM_TOKEN not set' };

  try {
    // Search for existing contact
    const searchRes = await fetch(
      `${GHL_API}/contacts/?locationId=${CS_GHL_LOCATION_ID}&query=${encodeURIComponent(params.email)}&limit=1`,
      { headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION }, signal: AbortSignal.timeout(8000) },
    );

    let existingId: string | null = null;
    if (searchRes.ok) {
      const data = await searchRes.json() as { contacts?: Array<{ id: string }> };
      existingId = data.contacts?.[0]?.id ?? null;
    }

    const contactPayload = {
      locationId: CS_GHL_LOCATION_ID,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone || undefined,
      companyName: params.businessName || undefined,
      city: params.city || undefined,
      state: params.state || undefined,
      source: 'Kyra GHL Sub-Account Request',
      tags: ['ghl-sub-account-request', `kyra-agency-${params.agencyName.toLowerCase().replace(/\s+/g, '-')}`],
      customFields: [
        { key: 'request_id', field_value: params.requestId },
        { key: 'kyra_client', field_value: params.kyraClientName },
        { key: 'request_type', field_value: 'Free GHL Sub-Account' },
      ],
    };

    if (existingId) {
      // Update existing
      await fetch(`${GHL_API}/contacts/${existingId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Version: GHL_VERSION },
        body: JSON.stringify(contactPayload),
        signal: AbortSignal.timeout(8000),
      });
      return { contactId: existingId };
    } else {
      // Create new
      const createRes = await fetch(`${GHL_API}/contacts/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Version: GHL_VERSION },
        body: JSON.stringify(contactPayload),
        signal: AbortSignal.timeout(8000),
      });
      if (!createRes.ok) {
        const err = await createRes.text().catch(() => '');
        return { contactId: null, error: `GHL create failed (${createRes.status}): ${err.slice(0, 100)}` };
      }
      const created = await createRes.json() as { contact?: { id: string } };
      return { contactId: created.contact?.id ?? null };
    }
  } catch (err) {
    return { contactId: null, error: String(err) };
  }
}

// ── Helper: upsert into Kyra CRM ─────────────────────────────────────────────

async function syncToCRM(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName?: string;
  city?: string;
  state?: string;
  requestId: string;
  agencyName: string;
  kyraClientName: string;
  ghlContactId: string | null;
}): Promise<{ contactId: string | null }> {
  const db = createServiceClientWithoutCookies();

  // Check if contact already exists in Kyra CRM
  const { data: existing } = await db
    .from('crm_contacts')
    .select('id')
    .eq('agency_id', CS_AGENCY_ID)
    .eq('email', params.email.toLowerCase())
    .limit(1)
    .single();

  const contactData = {
    agency_id: CS_AGENCY_ID,
    client_id: CS_CLIENT_ID,
    first_name: params.firstName,
    last_name: params.lastName,
    email: params.email.toLowerCase(),
    phone: params.phone || null,
    source: 'ghl-sub-account-request',
    source_id: params.requestId,
    stage: 'lead',
    tags: ['ghl-sub-account-request', params.agencyName],
    custom_fields: {
      business_name: params.businessName || null,
      city: params.city || null,
      state: params.state || null,
      request_id: params.requestId,
      kyra_client: params.kyraClientName,
      ghl_contact_id: params.ghlContactId || null,
      request_type: 'Free GHL Sub-Account',
    },
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await db.from('crm_contacts').update(contactData).eq('id', existing.id);
    return { contactId: existing.id };
  } else {
    const { data } = await db
      .from('crm_contacts')
      .insert({ ...contactData, avatar_color: '#4f46e5' })
      .select('id')
      .single();
    return { contactId: data?.id ?? null };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

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

  if (!body.businessName?.trim() || !body.contactName?.trim() || !body.contactEmail?.trim()) {
    return NextResponse.json(
      { error: 'Business name, contact name, and contact email are required.' },
      { status: 400 },
    );
  }

  const db = createServiceClientWithoutCookies();

  const { data: client, error: clientError } = await db
    .from('agency_clients')
    .select('id, name, agency_id')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { data: existing } = await db
    .from('ghl_subaccount_requests')
    .select('id, status')
    .eq('client_id', clientId)
    .in('status', ['pending', 'in_progress'])
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "A request for this client is already pending. We'll email you when it's ready." },
      { status: 409 },
    );
  }

  // Split contact name
  const nameParts = body.contactName.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || '';

  // ── 1. Save to ghl_subaccount_requests ────────────────────────────────────
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
  const agencyName = agency.name || 'Unknown Agency';
  const kyraClientName = client.name || clientId;

  // ── 2. Sync to GHL (fire-and-forget but log result) ───────────────────────
  const ghlResult = await syncToGHL({
    firstName, lastName,
    email: body.contactEmail.trim().toLowerCase(),
    phone: body.contactPhone?.trim(),
    businessName: body.businessName.trim(),
    city: body.city?.trim(),
    state: body.state?.trim(),
    requestId,
    agencyName,
    kyraClientName,
  });

  if (ghlResult.error) {
    console.warn('[request-subaccount] GHL sync warning:', ghlResult.error);
  } else {
    console.log(`[request-subaccount] ✅ GHL contact: ${ghlResult.contactId}`);
  }

  // ── 3. Sync to Kyra CRM ───────────────────────────────────────────────────
  const crmResult = await syncToCRM({
    firstName, lastName,
    email: body.contactEmail.trim().toLowerCase(),
    phone: body.contactPhone?.trim(),
    businessName: body.businessName.trim(),
    city: body.city?.trim(),
    state: body.state?.trim(),
    requestId,
    agencyName,
    kyraClientName,
    ghlContactId: ghlResult.contactId,
  });

  console.log(`[request-subaccount] ✅ CRM contact: ${crmResult.contactId}`);

  // ── 4. Email support@conversionsystem.com ─────────────────────────────────
  const location = [body.city, body.state, body.country || 'US'].filter(Boolean).join(', ');

  const internalHtml = `
    <div style="font-family:-apple-system,sans-serif;max-width:620px;margin:0 auto;">
      <div style="background:#4f46e5;color:white;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">🟠 New GHL Sub-Account Request</h1>
        <p style="margin:6px 0 0;opacity:0.8;font-size:13px;">Request #${requestId} · ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })} ET</p>
      </div>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
          <tr style="background:#fff;border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;font-weight:600;width:160px;">Business Name</td>
            <td style="padding:10px 8px;font-weight:700;color:#111827;">${body.businessName}</td>
          </tr>
          <tr style="background:#f9fafb;border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;font-weight:600;">Contact Name</td>
            <td style="padding:10px 8px;color:#111827;">${body.contactName}</td>
          </tr>
          <tr style="background:#fff;border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;font-weight:600;">Email</td>
            <td style="padding:10px 8px;"><a href="mailto:${body.contactEmail}" style="color:#4f46e5;">${body.contactEmail}</a></td>
          </tr>
          <tr style="background:#f9fafb;border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;font-weight:600;">Phone</td>
            <td style="padding:10px 8px;color:#111827;">${body.contactPhone || '—'}</td>
          </tr>
          <tr style="background:#fff;border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;font-weight:600;">Location</td>
            <td style="padding:10px 8px;color:#111827;">${location || '—'}</td>
          </tr>
          <tr style="background:#f9fafb;border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;font-weight:600;">Timezone</td>
            <td style="padding:10px 8px;color:#111827;">${body.timezone || 'America/New_York'}</td>
          </tr>
          <tr style="background:#fff;border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;color:#6b7280;font-weight:600;">Kyra Agency</td>
            <td style="padding:10px 8px;color:#111827;">${agencyName}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:10px 8px;color:#6b7280;font-weight:600;">Kyra Client</td>
            <td style="padding:10px 8px;color:#111827;">${kyraClientName}</td>
          </tr>
        </table>

        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
          <div style="flex:1;min-width:180px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:6px;padding:12px;">
            <p style="margin:0;font-size:12px;font-weight:700;color:#065f46;">✅ Kyra CRM</p>
            <p style="margin:4px 0 0;font-size:12px;color:#047857;">${crmResult.contactId ? 'Contact synced' : 'Sync failed'}</p>
          </div>
          <div style="flex:1;min-width:180px;background:${ghlResult.contactId ? '#ecfdf5' : '#fef9c3'};border:1px solid ${ghlResult.contactId ? '#6ee7b7' : '#fde047'};border-radius:6px;padding:12px;">
            <p style="margin:0;font-size:12px;font-weight:700;color:${ghlResult.contactId ? '#065f46' : '#854d0e'};">${ghlResult.contactId ? '✅' : '⚠️'} GHL Contact</p>
            <p style="margin:4px 0 0;font-size:12px;color:${ghlResult.contactId ? '#047857' : '#a16207'};">${ghlResult.contactId ? `ID: ${ghlResult.contactId.slice(0, 12)}...` : (ghlResult.error || 'Sync failed')}</p>
          </div>
        </div>

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px;font-size:13px;color:#92400e;">
          <strong>Action needed:</strong><br>
          1. Create sub-account in GHL for <strong>${body.businessName}</strong><br>
          2. In Kyra → Supabase → <code>ghl_subaccount_requests</code> → find <code>#${requestId}</code> → set <code>ghl_location_id</code> and <code>status = completed</code>
        </div>
      </div>
    </div>`;

  await sendPlatformEmail({
    to: SUPPORT_EMAIL,
    subject: `[GHL Request #${requestId}] ${body.businessName} — ${body.contactName} (${body.contactEmail})`,
    html: internalHtml,
    fromName: 'Kyra Platform',
    replyTo: body.contactEmail,
  });

  // ── 5. Confirmation to contact (the business owner, not the Kyra user) ───────
  const contactEmail = body.contactEmail!.trim().toLowerCase();
  if (contactEmail) {
    await sendPlatformEmail({
      to: contactEmail,
      subject: `GHL sub-account request received — ${body.businessName} (#${requestId})`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#4f46e5;color:white;padding:24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">✅ GHL Sub-Account Request Received</h1>
            <p style="margin:4px 0 0;opacity:0.8;font-size:14px;">Request #${requestId}</p>
          </div>
          <div style="background:white;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <p style="color:#374151;font-size:15px;">Hi ${firstName},</p>
            <p style="color:#374151;font-size:15px;">We've received your request to create a GoHighLevel sub-account for <strong>${body.businessName}</strong>. Our team will set it up and connect it to your Kyra dashboard within 1 business day.</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin:20px 0;font-size:14px;">
              <p style="margin:0 0 6px;"><strong style="color:#111827;">Request ID:</strong> #${requestId}</p>
              <p style="margin:0 0 6px;"><strong style="color:#111827;">Business:</strong> ${body.businessName}</p>
              <p style="margin:0 0 6px;"><strong style="color:#111827;">Contact:</strong> ${body.contactName}</p>
              <p style="margin:0;"><strong style="color:#111827;">Status:</strong> <span style="color:#d97706;">⏳ Pending</span></p>
            </div>
            <p style="color:#374151;font-size:14px;">Questions? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:#4f46e5;">${SUPPORT_EMAIL}</a>.</p>
            <p style="color:#374151;font-size:14px;margin-bottom:0;">— The Kyra Team</p>
          </div>
        </div>`,
      fromName: 'Kyra',
      replyTo: SUPPORT_EMAIL,
    });
  }

  console.log(`[request-subaccount] ✅ #${requestId} — CRM: ${crmResult.contactId} | GHL: ${ghlResult.contactId}`);

  return NextResponse.json({
    ok: true,
    requestId,
    synced: { crm: !!crmResult.contactId, ghl: !!ghlResult.contactId },
    message: `Request submitted! We'll create your GHL sub-account and connect it within 1 business day. Check your email for confirmation.`,
  });
}
