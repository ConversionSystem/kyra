/**
 * POST /api/agency/pipeline/leads/[id]/message
 * Send a manual message to a pipeline lead via GHL
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';
const OUTREACH_LOCATION_ID = 'y1BFVhXMDNUPlbPxEpSA';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, type = 'SMS' } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();

  // Get lead
  const { data: lead } = await svc.from('pipeline_leads').select('ghl_contact_id, full_name').eq('id', id).single();
  if (!lead?.ghl_contact_id) {
    return NextResponse.json({ error: 'Lead has no GHL contact. Launch outreach first.' }, { status: 400 });
  }

  // Get GHL token
  const { data: ghlClient } = await svc
    .from('agency_clients')
    .select('ghl_private_token')
    .eq('ghl_location_id', OUTREACH_LOCATION_ID)
    .not('ghl_private_token', 'is', null)
    .limit(1)
    .single();

  if (!ghlClient?.ghl_private_token) {
    return NextResponse.json({ error: 'GHL not connected' }, { status: 500 });
  }

  const token = ghlClient.ghl_private_token as string;

  try {
    const msgRes = await fetch(`${GHL_API}/conversations/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        contactId: lead.ghl_contact_id,
        message: message.trim(),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!msgRes.ok) {
      const errText = await msgRes.text().catch(() => '');
      return NextResponse.json({ error: `GHL error: ${msgRes.status} ${errText.slice(0, 200)}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, contactName: lead.full_name });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
