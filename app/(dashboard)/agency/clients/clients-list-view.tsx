'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, FileDown, Loader2, Sparkles, Pause, Play, Trash2, CheckSquare, Square } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import HealthScoreBadge from '@/components/dashboard/health-score-badge';

// ── Setup Score ──────────────────────────────────────────────────────────────
// 3 pillars: Personality configured, GHL connected, AI tested/active
interface SetupPillar { label: string; done: boolean }

function getSetupPillars(client: AgencyClient): SetupPillar[] {
  const cc = (client.container_config as Record<string, unknown>) ?? {};
  return [
    {
      label: 'Personality',
      done: !!(cc.persona || cc.instructions),
    },
    {
      label: 'GHL',
      done: !!(
        (client as any).ghl_location_id ||
        (client as any).ghl_private_token ||
        (client as any).ghl_access_token
      ),
    },
    {
      label: 'Tested',
      done: (client.usage_this_month ?? 0) > 0,
    },
  ];
}

function SetupScore({ client }: { client: AgencyClient }) {
  const pillars = getSetupPillars(client);
  const done = pillars.filter(p => p.done).length;
  const pct = Math.round((done / pillars.length) * 100);
  const missing = pillars.filter(p => !p.done).map(p => p.label);

  if (pct === 100) {
    return (
      <span className="text-[10px] font-medium text-green-600">✓ Setup complete</span>
    );
  }

  return (
    <div className="flex items-center gap-1.5" title={`Missing: ${missing.join(', ')}`}>
      <div className="flex gap-0.5">
        {pillars.map(p => (
          <div
            key={p.label}
            className={`h-1.5 w-5 rounded-full ${p.done ? 'bg-indigo-500' : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-400">{pct}%</span>
    </div>
  );
}

const gatewayStatusMap: Record<string, { dot: string; label: string }> = {
  running:      { dot: 'bg-green-400',  label: 'Live' },
  starting:     { dot: 'bg-yellow-400', label: 'Starting' },
  provisioning: { dot: 'bg-blue-400',   label: 'Deploying' },
  error:        { dot: 'bg-red-400',    label: 'Offline' },
};

function GatewayDot({ status }: { status: string | null }) {
  const s = status ? gatewayStatusMap[status] : null;
  if (!s) return <span className="inline-flex items-center gap-1 text-[10px] text-gray-400"><span className="h-1.5 w-1.5 rounded-full bg-gray-300 inline-block" />Not deployed</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] text-gray-500"><span className={`h-1.5 w-1.5 rounded-full ${s.dot} inline-block`} />{s.label}</span>;
}

const statusColors: Record<string, string> = {
  active: 'border-green-200 bg-green-50 text-green-600',
  paused: 'border-yellow-200 bg-yellow-50 text-yellow-600',
  setup: 'border-blue-200 bg-blue-50 text-blue-600',
};

const statusFilters = ['all', 'active', 'paused', 'setup'] as const;

interface ClientsListViewProps {
  clients: AgencyClient[];
  plan?: string;
  clientLimit?: number;
}

export function ClientsListView({ clients, plan = 'free', clientLimit = 1 }: ClientsListViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [demoCreating, setDemoCreating] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (currentFiltered: AgencyClient[]) => {
    const allSelected = currentFiltered.length > 0 && currentFiltered.every((c) => selectedIds.has(c.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentFiltered.map((c) => c.id)));
    }
  };

  const handleBulkStatus = async (status: 'active' | 'paused') => {
    setIsBulkActing(true);
    await Promise.all(
      [...selectedIds].map((id) =>
        fetch(`/api/agency/clients/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      )
    );
    setSelectedIds(new Set());
    setIsBulkActing(false);
    router.refresh();
  };

  const handleBulkDelete = async () => {
    if (!confirmingDelete) { setConfirmingDelete(true); return; }
    setIsBulkActing(true);
    setConfirmingDelete(false);
    await Promise.all(
      [...selectedIds].map((id) =>
        fetch(`/api/agency/clients/${id}`, { method: 'DELETE' })
      )
    );
    setSelectedIds(new Set());
    setIsBulkActing(false);
    router.refresh();
  };

  const handleCreateDemo = async () => {
    setDemoCreating(true);
    try {
      const res = await fetch('/api/agency/demo-client', { method: 'POST' });
      const d = await res.json();
      if (d.clientId) {
        router.push(`/agency/clients/${d.clientId}`);
      }
    } catch {
      setDemoCreating(false);
    }
  };

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const handleBulkExport = async () => {
    if (isBulkExporting || clients.length === 0) return;
    setIsBulkExporting(true);
    try {
      const sections: string[] = [
        `# Agency Clients — Combined Export`,
        `> Exported on ${new Date().toISOString().split('T')[0]}`,
        `> ${clients.length} client${clients.length !== 1 ? 's' : ''}`,
        ``,
      ];
      for (const client of clients) {
        const res = await fetch(`/api/agency/clients/${client.id}/export?type=all&range=30d&format=md`);
        if (res.ok) {
          sections.push(await res.text());
          sections.push(`\n---\n`);
        } else {
          sections.push(`## ${client.name}\n\n*Export failed.*\n\n---\n`);
        }
      }
      const blob = new Blob([sections.join('\n')], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-clients-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    setIsBulkExporting(false);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {clients.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkExport} disabled={isBulkExporting}>
              {isBulkExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              <span className="hidden sm:inline">{isBulkExporting ? 'Exporting...' : 'Export All'}</span>
            </Button>
          )}
          {clients.length >= clientLimit ? (
            <Link href="/agency/plans">
              <Button size="sm" className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Upgrade to Add More</span>
                <span className="sm:hidden">Upgrade</span>
              </Button>
            </Link>
          ) : (
            <Link href="/agency/clients/new">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Client</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Plan usage bar */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 capitalize">
              <span className="font-medium text-gray-700">{plan}</span> plan
              &nbsp;·&nbsp; {clients.length} / {clientLimit} client{clientLimit === 1 ? '' : 's'} used
            </span>
            {clients.length >= clientLimit && (
              <span className="text-xs font-semibold text-amber-600">Limit reached</span>
            )}
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                clients.length >= clientLimit ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(100, (clients.length / clientLimit) * 100)}%` }}
            />
          </div>
        </div>
        {clients.length >= clientLimit && (
          <Link href="/agency/plans" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap">
            View plans →
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white border-gray-200"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                statusFilter === filter
                  ? 'border-gray-300 bg-gray-100 text-gray-900'
                  : 'border-gray-200 bg-white text-gray-400 hover:text-gray-700'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5">
          <span className="text-sm font-semibold text-indigo-700">
            {selectedIds.size} client{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex-1" />
          <button
            onClick={() => { setSelectedIds(new Set()); setConfirmingDelete(false); }}
            className="text-xs text-indigo-400 hover:text-indigo-700 transition-colors"
          >
            Deselect all
          </button>
          <button
            onClick={() => handleBulkStatus('active')}
            disabled={isBulkActing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            <Play className="h-3 w-3" /> Resume
          </button>
          <button
            onClick={() => handleBulkStatus('paused')}
            disabled={isBulkActing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
          >
            <Pause className="h-3 w-3" /> Pause
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={isBulkActing}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              confirmingDelete
                ? 'border-red-400 bg-red-600 text-white hover:bg-red-700'
                : 'border-red-200 bg-white text-red-600 hover:bg-red-50'
            }`}
          >
            <Trash2 className="h-3 w-3" />
            {confirmingDelete ? 'Confirm delete?' : 'Delete'}
          </button>
          {isBulkActing && <Loader2 className="h-4 w-4 animate-spin text-indigo-500 shrink-0" />}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            {clients.length === 0 ? (
              <>
                <p className="text-xl font-semibold text-gray-700">Your AI employees are ready to work</p>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  Try a live demo to see Kyra in action — a pre-built dental AI with real conversation history. Takes 30 seconds.
                </p>
              </>
            ) : (
              <p className="text-gray-400">No clients match your filters.</p>
            )}
            {clients.length === 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={handleCreateDemo}
                  disabled={demoCreating}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {demoCreating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Setting up demo...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Try a Live Demo</>
                  )}
                </Button>
                <Link href="/agency/clients/new">
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" /> Add Real Client
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-gray-200">
                  <th className="pl-4 pr-2 py-4 w-8">
                    <button onClick={() => toggleAll(filtered)} className="text-gray-400 hover:text-gray-700 transition-colors">
                      {filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))
                        ? <CheckSquare className="h-4 w-4 text-indigo-600" />
                        : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-4 font-medium">Client</th>
                  <th className="p-4 font-medium">Industry</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Template</th>
                  <th className="p-4 font-medium">Setup</th>
                  <th className="p-4 font-medium">Health</th>
                  <th className="p-4 font-medium text-right">Usage</th>
                  <th className="p-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className={`border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors ${selectedIds.has(client.id) ? 'bg-indigo-50/50' : ''}`}>
                    <td className="pl-4 pr-2 py-4 w-8">
                      <button
                        onClick={(e) => { e.preventDefault(); toggleSelect(client.id); }}
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        {selectedIds.has(client.id)
                          ? <CheckSquare className="h-4 w-4 text-indigo-600" />
                          : <Square className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <Link href={`/agency/clients/${client.id}`} className="flex items-center gap-3 hover:text-indigo-600 transition-colors">
                        <div className="h-8 w-8 rounded-lg bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700 shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-400">{client.slug}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 text-gray-700">{client.industry || '—'}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <Badge className={statusColors[client.status]}>{client.status}</Badge>
                        <GatewayDot status={client.gateway_status ?? null} />
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 text-xs">{client.template?.name ?? '—'}</td>
                    <td className="p-4"><SetupScore client={client} /></td>
                    <td className="p-4"><HealthScoreBadge clientId={client.id} /></td>
                    <td className="p-4 text-right text-gray-700">{client.usage_this_month.toLocaleString()}</td>
                    <td className="p-4 text-gray-500 text-xs">
                      {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {filtered.map((client) => (
              <div key={client.id} className={`relative rounded-xl border bg-white transition-all ${selectedIds.has(client.id) ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-200'}`}>
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(client.id)}
                  className="absolute top-3 right-3 z-10 text-gray-400 hover:text-indigo-600 transition-colors p-1"
                >
                  {selectedIds.has(client.id)
                    ? <CheckSquare className="h-4 w-4 text-indigo-600" />
                    : <Square className="h-4 w-4" />}
                </button>
              <Link href={`/agency/clients/${client.id}`}>
                <div className="rounded-xl p-4 hover:bg-gray-50 transition-all active:scale-[0.99]">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700 shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{client.name}</p>
                        <Badge className={`${statusColors[client.status]} text-[10px] shrink-0`}>{client.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">
                          {client.industry || 'No industry'}
                          {client.template ? ` · ${client.template.name}` : ''}
                        </p>
                        <GatewayDot status={client.gateway_status ?? null} />
                      </div>
                      <div className="mt-1">
                        <SetupScore client={client} />
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <HealthScoreBadge clientId={client.id} />
                      <p className="text-[10px] text-gray-400">{client.usage_this_month.toLocaleString()} msgs</p>
                    </div>
                  </div>
                </div>
              </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
