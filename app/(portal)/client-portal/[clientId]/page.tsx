export const dynamic = 'force-dynamic';

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { isMasterEmail } from '@/lib/auth/admin';
import PortalDashboard from './portal-dashboard';

interface Props { params: Promise<{ clientId: string }> }

export default async function PortalPage({ params }: Props) {
  const { clientId } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  // Must be logged in
  if (!user) redirect(`/login?next=/client-portal/${clientId}`);

  const service = createServiceClientWithoutCookies();

  // Look up the client
  const { data: client } = await service
    .from('agency_clients')
    .select('id, name, industry, status, gateway_status, usage_this_month, agency_id, settings, container_config, created_at')
    .eq('id', clientId)
    .single();

  if (!client) notFound();

  // Look up the agency (for branding)
  const { data: agency } = await service
    .from('agencies')
    .select('id, name, settings')
    .eq('id', client.agency_id)
    .single();

  // Check access: either agency member OR sub_account_member
  const { data: agencyMembership } = await sb
    .from('agency_members')
    .select('role')
    .eq('agency_id', client.agency_id)
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: portalMembership } = await service
    .from('sub_account_members')
    .select('role, accepted_at')
    .eq('client_id', clientId)
    .eq('user_id', user.id)
    .maybeSingle();

  // Master emails always have access
  const isMaster = isMasterEmail(user.email);

  if (!isMaster && !agencyMembership && !portalMembership) {
    redirect(`/client-portal/${clientId}/request-access`);
  }

  const isAgencyMember = !!agencyMembership;
  const role = agencyMembership?.role ?? portalMembership?.role ?? 'viewer';
  const branding = {
    name: (agency?.settings as Record<string, unknown>)?.company_name as string ?? agency?.name ?? 'Your AI',
    logoUrl: (agency?.settings as Record<string, unknown>)?.logo_url as string | null ?? null,
    primaryColor: (agency?.settings as Record<string, unknown>)?.primary_color as string ?? '#4f46e5',
  };

  return (
    <PortalDashboard
      client={client}
      agency={agency}
      branding={branding}
      role={role}
      isAgencyMember={isAgencyMember}
      userEmail={user.email ?? ''}
    />
  );
}
