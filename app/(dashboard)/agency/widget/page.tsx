'use client';

import { useState, useEffect } from 'react';
import { SectionNav } from '@/components/dashboard/section-nav';
import { WidgetBuilderEmbedded } from '@/components/dashboard/widget-builder-embedded';
import { Loader2, Info } from 'lucide-react';
import Link from 'next/link';

interface ClientOption { id: string; name: string; industry?: string; container_config?: Record<string, unknown> | null }

export default function WidgetPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/agency/clients')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const list: ClientOption[] = (data.clients || data || []).filter(
          (c: Record<string, unknown>) => c.status === 'active' || c.status === 'setup'
        );
        setClients(list);
        if (list.length > 0) setSelectedClient(list[0].id);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selected = clients.find(c => c.id === selectedClient);

  return (
    <div className="space-y-0">
      <SectionNav currentHref="/agency/widget" />
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header + Client Selector */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat Widget — Cross-Client View</h1>
            <p className="text-sm text-gray-500 mt-1">
              Quickly switch between clients to configure their chat widgets from one place.
            </p>
          </div>
          {clients.length > 1 && (
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Disambiguation banner — explains why this exists alongside the
            per-client Channels → Chat Widget tab. Both surfaces edit the SAME
            container_config.widget_* fields for the SAME client. This page is
            just a multi-client switcher; per-client editing is canonical. */}
        {selectedClient && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p>
                You&apos;re editing <strong>{selected?.name || 'this client'}</strong>&apos;s widget — same fields you&apos;d see under{' '}
                <Link href={`/agency/clients/${selectedClient}?tab=channels`} className="underline hover:no-underline">
                  Clients → {selected?.name || 'this client'} → Channels → Chat Widget
                </Link>
                . Saves apply to that one client.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-gray-500">No active clients. Create a client first to configure the chat widget.</p>
        ) : selectedClient ? (
          <WidgetBuilderEmbedded
            key={selectedClient}
            clientId={selectedClient}
            clientName={selected?.name}
            clientIndustry={selected?.industry}
            initialConfig={selected?.container_config ?? undefined}
          />
        ) : null}
      </div>
    </div>
  );
}
