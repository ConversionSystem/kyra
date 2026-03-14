import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  // Always return 200 — never break the user-facing form
  try {
    const { clientId } = await params;
    const body = await request.json();
    const { name, phone, email, serviceType, message, businessName, source } = body as Record<string, string>;

    if (!name || !phone) {
      return NextResponse.json({ error: 'name and phone required' }, { status: 400, headers: CORS });
    }

    const supabase = getSupabase();

    // Look up client — table is agency_clients (not 'clients')
    const { data: client } = await supabase
      .from('agency_clients')
      .select('id, name, agency_id')
      .eq('id', clientId)
      .maybeSingle();

    if (!client) {
      // Client not found — still return 200 to not break the form
      console.warn('[LEAD] Client not found:', clientId);
      return NextResponse.json({ ok: true }, { headers: CORS });
    }

    const agencyId = client.agency_id;
    const summary = [
      `New website lead from ${businessName || client.name}`,
      `Name: ${name}`,
      `Phone: ${phone}`,
      email ? `Email: ${email}` : null,
      serviceType ? `Service interested in: ${serviceType}` : null,
      message ? `Message: ${message}` : null,
      `Source: ${source || 'website-form'}`,
    ].filter(Boolean).join('\n');

    // 1. Save to client_conversations (shows in Conversations inbox)
    await supabase.from('client_conversations').insert({
      client_id: clientId,
      agency_id: agencyId,
      role: 'user',
      content: summary,
      channel: 'website',
      contact_name: name,
      contact_phone: phone,
      contact_email: email || null,
      metadata: {
        lead: true,
        serviceType: serviceType || null,
        source: source || 'website-form',
        businessName: businessName || client.name,
      },
    });

    // 2. Upsert CRM contact (creates or updates by phone/email)
    let crmContactId: string | null = null;
    try {
      // Check for existing contact
      const { data: existing } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('agency_id', agencyId)
        .eq(email ? 'email' : 'phone', email || phone)
        .maybeSingle();

      if (existing) {
        crmContactId = existing.id;
        // Update with any new info
        await supabase.from('crm_contacts').update({
          ...(phone && { phone }),
          ...(email && { email }),
          updated_at: new Date().toISOString(),
        }).eq('id', crmContactId);
      } else {
        // Create new CRM contact — only use columns that exist in schema
        const nameParts = name.trim().split(' ');
        const { data: newContact } = await supabase
          .from('crm_contacts')
          .insert({
            agency_id: agencyId,
            first_name: nameParts[0] || name,
            last_name: nameParts.slice(1).join(' ') || '',
            email: email || null,
            phone: phone || null,
            source: 'website_form',
            stage: 'lead',
            tags: ['website-lead', ...(serviceType ? [`service:${serviceType}`] : [])],
            // Store message in custom_fields since there's no notes column
            custom_fields: message ? { inquiry: message, source: source || 'contact-form' } : { source: source || 'contact-form' },
          })
          .select('id')
          .single();

        if (newContact) {
          crmContactId = newContact.id;
          // Log CRM activity — use correct schema columns
          await supabase.from('crm_activities').insert({
            agency_id: agencyId,
            contact_id: crmContactId,
            type: 'website_form',
            subject: 'Website Lead Captured',
            body: summary,
            direction: 'inbound',
            channel: 'website',
            actor: 'system',
            actor_name: 'Website Form',
            metadata: { source: source || 'website-form', clientId, serviceType: serviceType || null },
          });
        }
      }
    } catch (crmErr) {
      console.error('[LEAD] CRM save error:', crmErr);
      // Non-fatal — conversation was already saved
    }

    // 3. No separate leads table needed — crm_contacts + crm_activities covers it
    // (web_chat_leads doesn't exist; pipeline_leads is for outbound campaigns)

    console.log(`[LEAD] Saved: ${name} (${phone}) → client ${clientId}, CRM: ${crmContactId}`);
    return NextResponse.json({ ok: true, crmContactId }, { headers: CORS });

  } catch (err) {
    console.error('[LEAD]', err);
    return NextResponse.json({ ok: true }, { headers: CORS });
  }
}
