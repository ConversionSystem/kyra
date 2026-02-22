import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { Zap } from 'lucide-react';
import Link from 'next/link';

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createServiceClient();

  // Fetch client (public read — no auth required)
  const { data: client, error } = await supabase
    .from('agency_clients')
    .select('id, name, industry, gateway_url, gateway_status, agency_id')
    .eq('id', clientId)
    .single();

  if (error || !client) redirect('/');

  // If the gateway is live, redirect straight to the real OpenClaw terminal
  if (client.gateway_status === 'running' && client.gateway_url) {
    redirect(client.gateway_url);
  }

  // Fetch agency for branding (only shown on "not yet live" fallback)
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, settings')
    .eq('id', client.agency_id)
    .single();

  const agencyLogoUrl = (agency?.settings as Record<string, unknown>)?.logo_url as string | undefined;

  // Gateway not running yet — show a friendly holding page
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {agencyLogoUrl ? (
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={agencyLogoUrl} alt={`${agency?.name} logo`} className="h-full w-full object-contain p-0.5" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-bold">
              {client.name.charAt(0).toUpperCase()}
            </div>
          )}
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
