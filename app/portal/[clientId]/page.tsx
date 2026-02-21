import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { MessageSquare, Zap, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { PortalChat } from './portal-chat';

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createServiceClient();

  // Fetch client + agency (public read — no auth required)
  const { data: client, error } = await supabase
    .from('agency_clients')
    .select('id, name, industry, gateway_url, gateway_status, agency_id')
    .eq('id', clientId)
    .single();

  if (error || !client) redirect('/');

  // Fetch agency for branding
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('id', client.agency_id)
    .single();

  const isLive = client.gateway_status === 'running' && client.gateway_url;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-bold">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-white text-sm">{client.name}</p>
              <p className="text-xs text-gray-400">
                {client.industry || 'AI Employee'} · Powered by {agency?.name || 'Kyra'}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            isLive
              ? 'bg-green-900/50 text-green-400 border border-green-800'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            {isLive ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col">
        {isLive ? (
          <div className="flex-1 rounded-2xl border border-gray-800 bg-gray-900 flex flex-col overflow-hidden">
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{client.name}</p>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                  <p className="text-xs text-indigo-400">AI-powered · Ready to help</p>
                </div>
              </div>
            </div>
            <PortalChat clientId={client.id} clientName={client.name} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center">
            <div>
              <Zap className="h-10 w-10 text-gray-600 mx-auto mb-4" />
              <p className="text-sm font-semibold text-gray-400">AI Employee Coming Soon</p>
              <p className="text-xs text-gray-600 mt-2">Contact your agency to get set up.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-700 pb-6">
        AI employee managed by{' '}
        <span className="text-gray-500">{agency?.name || 'your agency'}</span>
        {' · '}Powered by{' '}
        <Link href="/" className="text-gray-500 hover:text-gray-300 transition">Kyra</Link>
      </p>
    </div>
  );
}
