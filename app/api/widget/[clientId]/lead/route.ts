import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const body = await request.json();
    const { name, phone, email, serviceType, message, businessName, source } = body as Record<string, string>;

    if (!name || !phone) {
      return NextResponse.json({ error: 'name and phone required' }, { status: 400, headers: CORS });
    }

    const supabase = await createClient();

    // Look up client (soft-fail — don't block the lead)
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, agency_id')
      .eq('id', clientId)
      .maybeSingle();

    if (client) {
      const leadSummary = [
        `🎯 *New website lead* from ${businessName || client.name}`,
        `Name: ${name}`,
        `Phone: ${phone}`,
        email ? `Email: ${email}` : null,
        serviceType ? `Service: ${serviceType}` : null,
        message ? `Message: ${message}` : null,
        `Source: ${source || 'website-contact-form'}`,
      ]
        .filter(Boolean)
        .join('\n');

      await supabase.from('client_conversations').insert({
        client_id: clientId,
        agency_id: client.agency_id,
        role: 'user',
        content: leadSummary,
        channel: 'website',
        contact_name: name,
        contact_phone: phone,
        contact_email: email || null,
        metadata: { lead: true, serviceType: serviceType || null, source: source || 'website-contact-form' },
      });
    }

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (err) {
    console.error('[LEAD]', err);
    // Always 200 — never break the user-facing form
    return NextResponse.json({ ok: true }, { headers: CORS });
  }
}
