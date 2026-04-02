'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Phone, PhoneCall, Settings, Users, Zap, AlertTriangle,
  CheckCircle2, BarChart3, ExternalLink, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionNav } from '@/components/dashboard/section-nav';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientVoiceRow {
  id: string;
  name: string;
  industry: string | null;
  voiceEnabled: boolean;
  provider: string | null;
  phoneNumber: string | null;
  assistantId: string | null;
}

interface UsageData {
  minutesUsed: number;
  minuteLimit: number;
}

interface Props {
  clients: ClientVoiceRow[];
  usage: UsageData | null;
  totalCallCount: number;
  agencyId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  openclaw: 'Kyra Native',
  vapi: 'VAPI',
  retell: 'Retell',
  synthflow: 'Synthflow',
};

function ProviderBadge({ provider }: { provider: string | null }) {
  if (!provider) return null;
  const label = PROVIDER_LABELS[provider] ?? provider;
  return (
    <span className="text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded">
      {label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function VoiceHubClient({ clients, usage, totalCallCount, agencyId }: Props) {
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const enabledClients = clients.filter(c => c.voiceEnabled);
  const disabledClients = clients.filter(c => !c.voiceEnabled);

  const filtered = filter === 'enabled' ? enabledClients
    : filter === 'disabled' ? disabledClients
    : clients;

  const usagePct = usage && usage.minuteLimit > 0
    ? Math.round((usage.minutesUsed / usage.minuteLimit) * 100)
    : 0;

  return (
    <div className="space-y-0">
      <SectionNav currentHref="/agency/voice" />

      <div className="p-4 sm:p-6 md:p-8 max-w-6xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Phone className="h-6 w-6 text-indigo-600" />
            Voice AI
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage AI phone agents across all your clients
          </p>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Voice-Enabled Clients"
            value={String(enabledClients.length)}
            sub={`of ${clients.length} total`}
            icon={PhoneCall}
            color="text-indigo-600 bg-indigo-50 border-indigo-200"
          />
          <StatCard
            label="Total Calls"
            value={String(totalCallCount)}
            sub="all time"
            icon={BarChart3}
            color="text-blue-600 bg-blue-50 border-blue-200"
          />
          {usage ? (
            <>
              <StatCard
                label="Minutes Used"
                value={String(usage.minutesUsed)}
                sub={`of ${usage.minuteLimit} limit`}
                icon={Zap}
                color={usagePct >= 90 ? 'text-red-600 bg-red-50 border-red-200' : usagePct >= 70 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}
              />
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">Usage</p>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                  <div
                    className={`h-2 rounded-full transition-all ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(usagePct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{usagePct}% of monthly limit</p>
              </div>
            </>
          ) : (
            <StatCard
              label="Minutes Used"
              value="—"
              sub="no usage data"
              icon={Zap}
              color="text-gray-500 bg-gray-50 border-gray-200"
            />
          )}
        </div>

        {/* Client List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                Client Voice Status
              </CardTitle>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {([
                  { id: 'all', label: 'All' },
                  { id: 'enabled', label: `Enabled (${enabledClients.length})` },
                  { id: 'disabled', label: `Disabled (${disabledClients.length})` },
                ] as const).map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                      filter === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Phone className="h-10 w-10 text-gray-300 mb-3" />
                <p className="font-medium text-gray-600">No clients found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map(client => (
                  <div key={client.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition">
                    {/* Status indicator */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      client.voiceEnabled ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {client.voiceEnabled
                        ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                        : <AlertTriangle className="h-4 w-4 text-gray-400" />
                      }
                    </div>

                    {/* Client info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{client.name}</span>
                        {client.industry && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full capitalize">
                            {client.industry}
                          </span>
                        )}
                        {client.voiceEnabled && <ProviderBadge provider={client.provider} />}
                      </div>
                      {client.voiceEnabled && client.phoneNumber && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.phoneNumber}
                        </p>
                      )}
                      {!client.voiceEnabled && (
                        <p className="text-xs text-gray-400 mt-0.5">Voice not configured</p>
                      )}
                    </div>

                    {/* Action */}
                    <Link
                      href={`/agency/clients/${client.id}?tab=settings&sub=voice`}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 shrink-0"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      {client.voiceEnabled ? 'Manage' : 'Enable'}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/agency/analytics"
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Voice Analytics</p>
              <p className="text-xs text-gray-500">See call trends and channel breakdown</p>
            </div>
          </Link>
          <Link
            href="/agency/clients"
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">All Clients</p>
              <p className="text-xs text-gray-500">Open a client to configure their voice AI</p>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-black">{value}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  );
}
