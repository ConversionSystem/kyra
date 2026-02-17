'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, FileDown, Loader2 } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

const statusColors: Record<string, string> = {
  active: 'border-green-200 bg-green-50 text-green-600',
  paused: 'border-yellow-200 bg-yellow-50 text-yellow-600',
  setup: 'border-blue-200 bg-blue-50 text-blue-600',
};

const statusFilters = ['all', 'active', 'paused', 'setup'] as const;

interface ClientsListViewProps {
  clients: AgencyClient[];
}

export function ClientsListView({ clients }: ClientsListViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isBulkExporting, setIsBulkExporting] = useState(false);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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
          <Link href="/agency/clients/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Client</span>
            </Button>
          </Link>
        </div>
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

      {/* Empty state */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">
              {clients.length === 0 ? 'No clients yet. Create your first one!' : 'No clients match your filters.'}
            </p>
            {clients.length === 0 && (
              <Link href="/agency/clients/new" className="mt-4 inline-block">
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" /> Add Client
                </Button>
              </Link>
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
                  <th className="p-4 font-medium">Client</th>
                  <th className="p-4 font-medium">Industry</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Template</th>
                  <th className="p-4 font-medium text-right">Usage</th>
                  <th className="p-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
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
                    <td className="p-4"><Badge className={statusColors[client.status]}>{client.status}</Badge></td>
                    <td className="p-4 text-gray-500 text-xs">{client.template?.name ?? '—'}</td>
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
              <Link key={client.id} href={`/agency/clients/${client.id}`}>
                <div className="rounded-xl border border-gray-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all active:scale-[0.99]">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700 shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{client.name}</p>
                        <Badge className={`${statusColors[client.status]} text-[10px] shrink-0`}>{client.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {client.industry || 'No industry'}
                        {client.template ? ` · ${client.template.name}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-gray-700">{client.usage_this_month.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">messages</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
