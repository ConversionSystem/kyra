'use client';

import { useState, useEffect } from 'react';
import { getAllPremiumTemplates, type PremiumTemplate } from '@/lib/billing/premium-templates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, ArrowRight, Check, Loader2, X, Search } from 'lucide-react';
import { SEOSetupWizard } from '../clients/[id]/seo-setup-wizard';
import { SectionNav } from '@/components/dashboard/section-nav';

interface Client {
  id: string;
  name: string;
  settings?: Record<string, unknown>;
}

// ── Client Picker Modal ────────────────────────────────────────────────────

function ClientPickerModal({
  templateId,
  onSelect,
  onClose,
}: {
  templateId: string;
  onSelect: (client: Client) => void;
  onClose: () => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch('/api/agency/clients')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => setClients(data.clients ?? data ?? []))
      .catch((err) => { console.error('[templates] load clients:', err); setLoadError(true); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) => {
    const alreadyActive = c.settings?.premium_template === templateId;
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase());
    return !alreadyActive && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Choose a Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Client List */}
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading clients...
            </div>
          ) : loadError ? (
            <div className="py-10 text-center">
              <p className="text-sm text-red-500">Failed to load clients. Please try again.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500">
                {clients.length === 0 ? 'No clients yet. Create a client first.' : 'All eligible clients already have this template.'}
              </p>
            </div>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                onClick={() => onSelect(client)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 text-left transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{client.name}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onClose} className="w-full">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ── Setup Wizard Modal ─────────────────────────────────────────────────────

function SetupWizardModal({
  client,
  onComplete,
  onClose,
}: {
  client: Client;
  onComplete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
      <div className="min-h-full flex items-start justify-center py-10 px-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              🐾 Vet SEO Worker — {client.name}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <SEOSetupWizard
              clientId={client.id}
              clientName={client.name}
              onComplete={() => { onComplete(); onClose(); }}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function PremiumTemplatesPage() {
  const templates = getAllPremiumTemplates();
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [wizardClient, setWizardClient] = useState<Client | null>(null);
  const [activated, setActivated] = useState<string | null>(null);

  return (
    <div className="space-y-0">
    <SectionNav currentHref="/agency/templates" />
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-500" />
          Premium Templates
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Specialized AI workers with everything included — LLM costs, SEO tools, and infrastructure — at a flat monthly price per client.
          For free AI personality configuration, open any client and use the AI Personality tab.
        </p>
      </div>

      {/* Success banner */}
      {activated && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">
            SEO Worker activated! Check the client's <strong>SEO tab</strong> to monitor progress.
          </p>
          <button onClick={() => setActivated(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onDeploy={() => setPickingFor(template.id)}
          />
        ))}

        {/* Coming Soon */}
        <Card className="border-dashed">
          <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center h-full min-h-48">
            <p className="text-sm font-medium text-gray-400 mb-1">More templates coming soon</p>
            <p className="text-xs text-gray-300">Restaurant SEO · Real Estate · Medical Practice · Legal</p>
          </CardContent>
        </Card>
      </div>

      {/* Client Picker Modal */}
      {pickingFor && !wizardClient && (
        <ClientPickerModal
          templateId={pickingFor}
          onSelect={(client) => {
            setWizardClient(client);
          }}
          onClose={() => setPickingFor(null)}
        />
      )}

      {/* Setup Wizard Modal */}
      {wizardClient && (
        <SetupWizardModal
          client={wizardClient}
          onComplete={() => setActivated(wizardClient.name)}
          onClose={() => {
            setWizardClient(null);
            setPickingFor(null);
          }}
        />
      )}
    </div>
    </div>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onDeploy,
}: {
  template: PremiumTemplate;
  onDeploy: () => void;
}) {
  return (
    <Card className="hover:border-blue-300 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-3xl">{template.icon}</span>
            <h2 className="text-base font-semibold text-gray-900 mt-2">{template.name}</h2>
            <Badge className="mt-1 bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
              {template.category}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">${template.price}</p>
            <p className="text-xs text-gray-400">/mo per client</p>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">{template.description}</p>

        <div className="space-y-1.5 mb-4">
          {template.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-emerald-700">
            <span className="font-semibold">Your margin:</span> Charge clients $500–2,000/mo.
            Your cost: ${template.price}/mo. Everything included.
          </p>
        </div>

        <Button className="w-full" onClick={onDeploy}>
          Deploy for a Client <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
