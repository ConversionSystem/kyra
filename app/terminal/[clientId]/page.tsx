import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { getGatewayByClientId } from '@/lib/ovh/gateway-resolver';

interface Props {
  params: Promise<{ clientId: string }>;
}

/**
 * /terminal/[clientId]
 *
 * Server-side redirect to the OpenClaw terminal.
 * Fetches the correct gateway URL + token, builds the authenticated URL,
 * and redirects. Since this is a server component redirect, the browser
 * follows it natively — no popup blocker, no client-side JavaScript.
 *
 * The link in the dashboard uses target="_blank" so this opens in a new tab.
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
  const dashboardUrl = `${baseUrl}/__openclaw__/#token=${encodeURIComponent(gateway.token)}`;

  redirect(dashboardUrl);
}
