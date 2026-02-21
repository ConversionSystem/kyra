import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { Terminal, ExternalLink, MessageSquare, Zap, CheckCircle2 } from 'lucide-react';
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

  const hasTerminal = client.gateway_status === 'running' && client.gateway_url;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              hasTerminal
                ? 'bg-green-900/50 text-green-400 border border-green-800'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hasTerminal ? 'bg-green-400' : 'bg-gray-500'}`} />
              {hasTerminal ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">

          {/* Terminal Access */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Terminal className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="font-bold text-white">Full Control Terminal</h2>
                <p className="text-xs text-gray-400">Manage your AI employee directly</p>
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              {[
                'Set personality, tone & instructions',
                'Upload knowledge base & documents',
                'Configure automations & cron jobs',
                'Connect channels (SMS, Telegram, web)',
                'View all conversation history',
                'Adjust memory & learning',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {hasTerminal ? (
              <a
                href={client.gateway_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold text-white"
              >
                <Terminal className="h-4 w-4" />
                Launch Terminal
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gray-800 text-gray-500 font-semibold cursor-not-allowed">
                <Terminal className="h-4 w-4" />
                Terminal not yet deployed
              </div>
            )}

            <p className="text-xs text-gray-600 mt-3 text-center">
              Opens in a new tab · Your changes apply instantly
            </p>
          </div>

          {/* Test Chat */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-600/20 border border-green-500/30 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h2 className="font-bold text-white">Test Your AI</h2>
                <p className="text-xs text-gray-400">Chat with it right now</p>
              </div>
            </div>

            {hasTerminal ? (
              <PortalChat clientId={client.id} clientName={client.name} />
            ) : (
              <div className="flex-1 flex items-center justify-center rounded-xl border border-gray-800 bg-gray-950 p-8 text-center">
                <div>
                  <Zap className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Terminal not deployed yet.</p>
                  <p className="text-xs text-gray-600 mt-1">Contact your agency to get set up.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-700 mt-8">
          AI employee managed by{' '}
          <span className="text-gray-500">{agency?.name || 'your agency'}</span>
          {' · '}Powered by{' '}
          <Link href="/" className="text-gray-500 hover:text-gray-300 transition">Kyra</Link>
        </p>
      </div>
    </div>
  );
}
