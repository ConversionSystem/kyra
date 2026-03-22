import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { getGatewayByClientId } from '@/lib/ovh/gateway-resolver';
import TerminalRedirect from './terminal-redirect';

interface Props {
  params: Promise<{ clientId: string }>;
}

/**
 * /terminal/[clientId]
 *
 * Server-side terminal launcher. Fetches the correct gateway URL and token,
 * then renders a client component that injects the token into sessionStorage
 * for the gateway domain before navigating. This bypasses iOS Safari stripping
 * ?token= from cross-origin URLs.
 */
export default async function TerminalPage({ params }: Props) {
  const { clientId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/terminal/${clientId}`);

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const gateway = await getGatewayByClientId(clientId);

  if (!gateway || gateway.agencyId !== result.agency.id) {
    notFound();
  }

  const baseUrl = gateway.url.replace(/\/$/, '');
  const dashboardUrl = `${baseUrl}/__openclaw__/`;
  const token = gateway.token;

  return (
    <TerminalRedirect
      dashboardUrl={dashboardUrl}
      token={token}
      gatewayUrl={gateway.url}
    />
  );
}
