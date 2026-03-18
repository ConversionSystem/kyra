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
    let { data: client } = await supabase
      .from('agency_clients')
      .select('id, name, agency_id')
      .eq('id', clientId)
      .maybeSingle();

    // Fallback: if clientId is not in agency_clients, it might be the site's
    // client_id that was orphaned. Try looking up the site instead.
    if (!client) {
      console.warn('[LEAD] Client not found in agency_clients, trying client_sites fallback:', clientId);

      // Try: clientId might be stored as client_id on a site row
      const { data: site } = await supabase
        .from('client_sites')
        .select('id, client_id, agency_id, business_name')
        .eq('client_id', clientId)
        .maybeSingle();

      if (site?.agency_id) {
        // Auto-create the missing agency_clients row so future leads work
        const slug = (site.business_name || 'client')
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

        const { data: newClient } = await supabase
          .from('agency_clients')
          .insert({
            id: clientId, // preserve the same ID so the widget doesn't need rebuild
            agency_id: site.agency_id,
            name: site.business_name || 'Website Client',
            slug: `${slug}-${Date.now().toString(36)}`,
            industry: '',
            status: 'active',
          })
          .select('id, name, agency_id')
          .single();

        if (newClient) {
          client = newClient;
          console.log('[LEAD] Auto-created agency_clients row for orphaned site:', clientId);
        } else {
          // Still create the lead using site's agency_id directly
          client = { id: clientId, name: site.business_name || 'Unknown', agency_id: site.agency_id };
          console.warn('[LEAD] Could not auto-create client, using site agency_id:', site.agency_id);
        }
      } else {
        // Last resort: check if clientId is actually a site ID
        const { data: siteById } = await supabase
          .from('client_sites')
          .select('id, client_id, agency_id, business_name')
          .eq('id', clientId)
          .maybeSingle();

        if (siteById?.agency_id) {
          client = { id: siteById.client_id || clientId, name: siteById.business_name || 'Unknown', agency_id: siteById.agency_id };
          console.warn('[LEAD] Matched by site ID instead of client ID:', clientId);
        } else {
          console.error('[LEAD] Client not found anywhere:', clientId);
          return NextResponse.json({ ok: true }, { headers: CORS });
        }
      }
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
    const { error: convError } = await supabase.from('client_conversations').insert({
      client_id: client.id,
      agency_id: agencyId,
      channel: 'website',
      user_message: summary,
      ai_response: '',   // NOT NULL constraint — use empty string for form leads (no AI reply)
      session_id: `form:${clientId}:${Date.now()}`,
      source_url: source || 'website-form',
    });

    if (convError) {
      console.error('[LEAD] Conversation insert error:', convError.message, convError.details);
    }

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
        const { data: newContact, error: insertError } = await supabase
          .from('crm_contacts')
          .insert({
            agency_id: agencyId,
            client_id: client.id,  // links to the Leads tab in the website dashboard
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

        if (insertError) {
          console.error('[LEAD] CRM insert error:', insertError.message, insertError.details, insertError.hint);
        }
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

    console.log(`[LEAD] Saved: ${name} (${phone}) → client ${client.id}, agency ${agencyId}, CRM: ${crmContactId}`);
    return NextResponse.json({ ok: true, crmContactId }, { headers: CORS });

  } catch (err) {
    console.error('[LEAD] Uncaught error:', err instanceof Error ? `${err.message}\n${err.stack}` : err);
    return NextResponse.json({ ok: true }, { headers: CORS });
  }
}
