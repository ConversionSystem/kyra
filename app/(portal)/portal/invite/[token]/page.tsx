export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import AcceptInviteClient from './accept-invite-client';

interface Props { params: Promise<{ token: string }> }

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  const service = createServiceClientWithoutCookies();

  // Look up invite
  const { data: invite } = await service
    .from('sub_account_invitations')
    .select('id, client_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle();

  // Not logged in — send to login with redirect back
  if (!user) {
    redirect(`/login?next=/portal/invite/${token}`);
  }

  // Look up client + agency for display
  const { data: client } = invite ? await service
    .from('agency_clients')
    .select('id, name, industry, agency_id')
    .eq('id', invite.client_id)
    .single() : { data: null };

  const { data: agency } = client ? await service
    .from('agencies')
    .select('name, settings')
    .eq('id', client.agency_id)
    .single() : { data: null };

  const branding = {
    name: (agency?.settings as Record<string, unknown>)?.company_name as string ?? agency?.name ?? 'Your Agency',
    logoUrl: (agency?.settings as Record<string, unknown>)?.logo_url as string | null ?? null,
    primaryColor: (agency?.settings as Record<string, unknown>)?.primary_color as string ?? '#4f46e5',
  };

  return (
    <AcceptInviteClient
      token={token}
      invite={invite}
      client={client}
      branding={branding}
      userEmail={user.email ?? ''}
    />
  );
}
