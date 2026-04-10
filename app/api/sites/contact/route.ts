import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, phone, message, clientId, businessName, source } = body;

    if (!name || !email) {
      return NextResponse.json(
        { ok: false, error: 'Name and email required' },
        { status: 400, headers: CORS },
      );
    }

    const supabase = createServiceClientWithoutCookies();

    // Find the client to get agency_id
    let agencyId: string | null = null;
    if (clientId) {
      const { data: client } = await supabase
        .from('agency_clients')
        .select('agency_id')
        .eq('id', clientId)
        .single();
      agencyId = client?.agency_id ?? null;
    }

    if (!agencyId) {
      console.error('[sites/contact] No agency_id found for clientId:', clientId);
      return NextResponse.json(
        { ok: false, error: 'Invalid client configuration' },
        { status: 400, headers: CORS },
      );
    }

    const firstName = name.split(' ')[0] ?? name;
    const lastName = name.split(' ').slice(1).join(' ') || '';

    // Check if contact already exists for this client
    const { data: existing } = await supabase
      .from('crm_contacts')
      .select('id, tags')
      .eq('email', email)
      .eq('client_id', clientId)
      .maybeSingle();

    if (existing) {
      // Update existing contact with new form data
      const existingTags = (existing.tags || []) as string[];
      const newTags = Array.from(new Set([...existingTags, 'website-lead']));
      await supabase.from('crm_contacts').update({
        phone: phone || undefined,
        tags: newTags,
        custom_fields: { website_message: message, business_name: businessName },
        stage: 'new',
      }).eq('id', existing.id);
    } else {
      // Check if contact exists under a different client (cross-client)
      const { data: crossClient } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (crossClient) {
        // Create a new contact for THIS client (different client_id)
        const { error: insertErr } = await supabase.from('crm_contacts').insert({
          client_id: clientId,
          agency_id: agencyId,
          first_name: firstName,
          last_name: lastName,
          email: email + '+' + clientId.slice(0, 8),
          phone: phone || null,
          source: source || 'website_form',
          stage: 'new',
          tags: ['website-lead'],
          custom_fields: { website_message: message, business_name: businessName, original_email: email },
        });
        if (insertErr) {
          console.error('[sites/contact] Cross-client insert error:', insertErr);
          return NextResponse.json({ ok: false, error: 'Failed to save lead' }, { status: 500, headers: CORS });
        }
      } else {
        // Brand new contact
        const { error: insertErr } = await supabase.from('crm_contacts').insert({
          client_id: clientId,
          agency_id: agencyId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || null,
          source: source || 'website_form',
          stage: 'new',
          tags: ['website-lead'],
          custom_fields: { website_message: message, business_name: businessName },
        });
        if (insertErr) {
          console.error('[sites/contact] Insert error:', insertErr);
          return NextResponse.json({ ok: false, error: 'Failed to save lead' }, { status: 500, headers: CORS });
        }
      }
    }

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (err) {
    console.error('[sites/contact] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500, headers: CORS },
    );
  }
}
