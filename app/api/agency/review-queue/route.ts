import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';

export const dynamic = 'force-dynamic';

// GET — fetch pending review items
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  // Fetch conversations flagged for review (needs_review = true in metadata)
  const { data: pending } = await supabase
    .from('client_conversations')
    .select('id, client_id, channel, user_message, ai_response, created_at, metadata')
    .eq('agency_id', result.agency.id)
    .eq('metadata->>needs_review', 'true')
    .order('created_at', { ascending: false })
    .limit(50);

  // Also fetch client names
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name, business_name')
    .eq('agency_id', result.agency.id);

  const clientMap = new Map((clients || []).map(c => [c.id, c.business_name || c.name || 'Unknown']));

  const items = (pending || []).map(p => ({
    id: p.id,
    client_id: p.client_id,
    client_name: clientMap.get(p.client_id) || 'Unknown',
    channel: p.channel,
    customer_message: p.user_message,
    ai_draft: p.ai_response,
    created_at: p.created_at,
    metadata: p.metadata,
  }));

  // Get review gate settings
  const settings = (result.agency.settings as Record<string, unknown>) ?? {};
  const reviewGateEnabled = settings.review_gate_enabled === true;
  const reviewGateClients = (settings.review_gate_clients as string[]) || [];

  return NextResponse.json({
    items,
    settings: { enabled: reviewGateEnabled, client_ids: reviewGateClients },
    total: items.length,
  });
}

// POST — approve/reject/update review gate settings
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const body = await request.json();

  // Update review gate settings
  if (body.action === 'update_settings') {
    const settings = (result.agency.settings as Record<string, unknown>) ?? {};
    settings.review_gate_enabled = body.enabled ?? settings.review_gate_enabled;
    if (body.client_ids) settings.review_gate_clients = body.client_ids;

    await supabase
      .from('agencies')
      .update({ settings })
      .eq('id', result.agency.id);

    return NextResponse.json({ ok: true });
  }

  // Approve a message
  if (body.action === 'approve' && body.id) {
    await supabase
      .from('client_conversations')
      .update({
        metadata: { needs_review: false, reviewed_at: new Date().toISOString(), reviewed_by: user.id, review_action: 'approved' },
      })
      .eq('id', body.id)
      .eq('agency_id', result.agency.id);

    return NextResponse.json({ ok: true, action: 'approved' });
  }

  // Edit and approve
  if (body.action === 'edit_approve' && body.id && body.edited_response) {
    await supabase
      .from('client_conversations')
      .update({
        ai_response: body.edited_response,
        metadata: { needs_review: false, reviewed_at: new Date().toISOString(), reviewed_by: user.id, review_action: 'edited', original_response: body.original_response },
      })
      .eq('id', body.id)
      .eq('agency_id', result.agency.id);

    return NextResponse.json({ ok: true, action: 'edited' });
  }

  // Reject (discard the response)
  if (body.action === 'reject' && body.id) {
    await supabase
      .from('client_conversations')
      .update({
        metadata: { needs_review: false, reviewed_at: new Date().toISOString(), reviewed_by: user.id, review_action: 'rejected' },
      })
      .eq('id', body.id)
      .eq('agency_id', result.agency.id);

    return NextResponse.json({ ok: true, action: 'rejected' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
