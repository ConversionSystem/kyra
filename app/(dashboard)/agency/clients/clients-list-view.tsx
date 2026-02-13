'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

const statusColors: Record<string, string> = {
  active: 'border-green-500/50 bg-green-500/10 text-green-400',
  paused: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
  setup: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
};

const statusFilters = ['all', 'active', 'paused', 'setup'] as const;

interface ClientsListViewProps {
  clients: AgencyClient[];
}

export function ClientsListView({ clients }: ClientsListViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Clients</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {clients.length} client{clients.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link href="/agency/clients/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-700"
          />
        </div>
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                statusFilter === filter
                  ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-zinc-500">
              {clients.length === 0
                ? 'No clients yet. Create your first one!'
                : 'No clients match your filters.'}
            </p>
            {clients.length === 0 && (
              <Link href="/agency/clients/new" className="mt-4 inline-block">
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Client
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-400 text-left border-b border-zinc-800">
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
                  <tr
                    key={client.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <Link
                        href={`/agency/clients/${client.id}`}
                        className="flex items-center gap-3 hover:text-violet-400 transition-colors"
                      >
                        <div className="h-8 w-8 rounded-lg bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{client.name}</p>
                          <p className="text-xs text-zinc-500">{client.slug}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 text-zinc-300">{client.industry || '—'}</td>
                    <td className="p-4">
                      <Badge className={statusColors[client.status]}>
                        {client.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-zinc-400 text-xs">
                      {client.template?.name ?? '—'}
                    </td>
                    <td className="p-4 text-right text-zinc-300">
                      {client.usage_this_month.toLocaleString()}
                    </td>
                    <td className="p-4 text-zinc-400 text-xs">
                      {new Date(client.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
