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

    const firstName = name.split(' ')[0] ?? name;
    const lastName = name.split(' ').slice(1).join(' ') || '';

    await supabase.from('crm_contacts').insert({
      client_id: clientId || null,
      agency_id: agencyId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      source: source || 'website_form',
      stage: 'new',
      notes: message || null,
      tags: ['website-lead'],
      custom_fields: { website_message: message, business_name: businessName },
    });

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (err) {
    console.error('[sites/contact] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500, headers: CORS },
    );
  }
}
