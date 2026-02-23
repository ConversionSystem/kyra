// POST /api/portal/invite — agency owner invites client staff to the sub-account portal
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId, email, role = 'viewer' } = await req.json();
  if (!clientId || !email) {
    return NextResponse.json({ error: 'clientId and email required' }, { status: 400 });
  }

  // Verify user is agency member for this client
  const { data: client } = await sb
    .from('agency_clients')
    .select('id, agency_id, name')
    .eq('id', clientId)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const { data: membership } = await sb
    .from('agency_members')
    .select('role')
    .eq('agency_id', client.agency_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Upsert invitation
  const { data: invite, error } = await sb
    .from('sub_account_invitations')
    .upsert(
      {
        client_id: clientId,
        agency_id: client.agency_id,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
        // Reset expiry on re-invite
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        accepted_at: null,
      },
      { onConflict: 'client_id,email', ignoreDuplicates: false }
    )
    .select('token')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/invite/${invite!.token}`;

  return NextResponse.json({
    ok: true,
    portalUrl,
    message: `Invite link created for ${email}`,
  });
}
