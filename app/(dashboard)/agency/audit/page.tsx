'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Clock, Filter, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, XCircle, Loader2, Search,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  client_id: string;
  agency_id: string;
  action_type: string;
  action_category: string;
  is_write: boolean;
  risk_level: 'low' | 'medium' | 'high';
  parameters: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface ClientInfo {
  id: string;
  name: string;
}

const RISK_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [clientFilter, setClientFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Fetch clients for filter dropdown
  useEffect(() => {
    fetch('/api/agency/clients')
      .then(r => r.ok ? r.json() : [])
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchAudit = useCallback(async () => {
    setLoading(true);

    // If no client selected, fetch from all clients
    const clientIds = clientFilter ? [clientFilter] : clients.map(c => c.id);

    if (clientIds.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      const allEntries: AuditEntry[] = [];
      // Fetch from first client (or selected one) — for simplicity with pagination
      const targetId = clientFilter || clientIds[0];
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (categoryFilter) params.set('category', categoryFilter);
      if (riskFilter) params.set('risk', riskFilter);

      if (clientFilter) {
        // Single client
        const res = await fetch(`/api/agency/clients/${targetId}/ghl/audit?${params}`);
        if (res.ok) {
          const json = await res.json();
          allEntries.push(...(json.data ?? []));
          setTotalPages(json.pagination?.pages ?? 1);
        }
      } else {
        // All clients — fetch page 1 from each, merge and sort
        const results = await Promise.all(
          clientIds.slice(0, 20).map(id =>
            fetch(`/api/agency/clients/${id}/ghl/audit?${params}`)
              .then(r => r.ok ? r.json() : { data: [] })
              .catch(() => ({ data: [] }))
          )
        );
        for (const r of results) allEntries.push(...(r.data ?? []));
        allEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setTotalPages(1); // Simplified for cross-client view
      }

      setEntries(allEntries);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, clientFilter, categoryFilter, riskFilter, clients]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name ?? id.slice(0, 8);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-indigo-100">
          <Shield className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500">All GHL actions across your clients</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="h-4 w-4" />
          Filters:
        </div>
        <select
          value={clientFilter}
          onChange={e => { setClientFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">All Clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">All Categories</option>
          {['contact', 'conversation', 'message', 'opportunity', 'pipeline', 'appointment', 'workflow'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={riskFilter}
          onChange={e => { setRiskFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">All Risk Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Risk</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <Search className="h-5 w-5 mx-auto mb-2" />
                    No actions logged yet
                  </td>
                </tr>
              ) : entries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatTime(entry.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {clientName(entry.client_id)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                    {entry.action_type}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {entry.action_category}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLORS[entry.risk_level]}`}>
                      {entry.risk_level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICONS[entry.status] ?? STATUS_ICONS.success}
                      <span className="capitalize text-gray-600">{entry.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                    {entry.duration_ms != null ? `${entry.duration_ms}ms` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
