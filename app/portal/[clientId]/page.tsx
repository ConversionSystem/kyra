import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { Zap } from 'lucide-react';
import Link from 'next/link';
import PortalChat from './portal-chat';

export default async function ClientPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams?: Promise<{ terminal?: string }>;
}) {
  const { clientId } = await params;
  const sp = await searchParams;
  const supabase = await createServiceClient();

  // Fetch client (public read — no auth required)
  const { data: client, error } = await supabase
    .from('agency_clients')
    .select('id, name, industry, gateway_url, gateway_token, gateway_status, agency_id')
    .eq('id', clientId)
    .single();

  if (error || !client) redirect('/');

  // Fetch agency for branding
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, settings')
    .eq('id', client.agency_id)
    .single();

  const agencySettings = (agency?.settings as Record<string, unknown>) || {};
  const accentColor = (agencySettings.accent_color as string | undefined) || '#4f46e5';

  // ?terminal=1 → send to raw OpenClaw terminal (power user / agency testing)
  if (sp?.terminal === '1' && client.gateway_status === 'running' && client.gateway_url) {
    const dest = client.gateway_token
      ? `${client.gateway_url}?token=${client.gateway_token}`
      : client.gateway_url;
    redirect(dest);
  }

  // Gateway running → show polished consumer chat UI
  if (client.gateway_status === 'running' && client.gateway_url && client.gateway_token) {
    return (
      <PortalChat
        clientName={client.name}
        agencyName={agency?.name}
        gatewayUrl={client.gateway_url}
        gatewayToken={client.gateway_token}
        accentColor={accentColor}
      />
    );
  }

  // Gateway not running yet — show holding page
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold text-white"
            style={{ backgroundColor: accentColor }}
          >
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-white text-base">{client.name}</p>
            <p className="text-xs text-gray-400">
              {client.industry || 'AI Employee'} · {agency?.name || 'Kyra'}
            </p>
          </div>
        </div>
      </div>

      {/* Offline state */}
      <div className="flex-1 flex items-center justify-center p-12 text-center">
        <div>
          <Zap className="h-10 w-10 text-gray-600 mx-auto mb-4" />
          <p className="text-sm font-semibold text-gray-400">AI Employee Coming Soon</p>
          <p className="text-xs text-gray-600 mt-2">Contact your agency to get set up.</p>
        </div>
      </div>

      <p className="text-center text-[11px] text-gray-600 pb-4 pt-2">
        Powered by{' '}
        <Link href="/" className="text-gray-500 hover:text-gray-400 transition">Kyra</Link>
      </p>
    </div>
  );
}
