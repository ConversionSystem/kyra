// POST /api/portal/accept — accept a portal invitation
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const service = createServiceClientWithoutCookies();

  // Look up invite
  const { data: invite } = await service
    .from('sub_account_invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: 'Invite already used' }, { status: 409 });
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite link has expired' }, { status: 410 });
  }

  // Verify email matches (optional but recommended)
  if (invite.email && invite.email !== user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}` },
      { status: 403 }
    );
  }

  // Create sub_account_member
  const { error: memberErr } = await service
    .from('sub_account_members')
    .upsert(
      {
        client_id: invite.client_id,
        agency_id: invite.agency_id,
        user_id: user.id,
        email: invite.email,
        role: invite.role,
        invited_by: invite.invited_by,
        accepted_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,user_id', ignoreDuplicates: false }
    );

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  // Mark invite as accepted
  await service
    .from('sub_account_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  return NextResponse.json({
    ok: true,
    clientId: invite.client_id,
    role: invite.role,
    redirectTo: `/portal/${invite.client_id}`,
  });
}
