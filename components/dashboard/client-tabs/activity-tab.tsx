'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Clock, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronRight, AlertTriangle,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

interface Proposal {
  id: string;
  action_type: string;
  action_category: string;
  risk_level: 'low' | 'medium' | 'high';
  parameters: Record<string, unknown>;
  description: string;
  status: string;
  proposed_at: string;
  expires_at: string;
}

interface LogEntry {
  id: string;
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

const RISK_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

export function ActivityTab({ client }: { client: AgencyClient }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [proposalsRes, logsRes] = await Promise.all([
        fetch(`/api/agency/clients/${client.id}/ghl/actions`),
        fetch(`/api/agency/clients/${client.id}/ghl/audit?limit=50`),
      ]);

      if (proposalsRes.ok) {
        setProposals(await proposalsRes.json());
      }
      if (logsRes.ok) {
        const json = await logsRes.json();
        setLogs(json.data ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDecision = async (proposalId: string, decision: 'approve' | 'reject') => {
    setDeciding(proposalId);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}/ghl/actions/${proposalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        setProposals(prev => prev.filter(p => p.id !== proposalId));
      }
    } catch {
      // Silently fail
    } finally {
      setDeciding(null);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading activity...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Proposals */}
      {proposals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="font-medium text-gray-900">Pending Approvals</h3>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {proposals.length}
            </span>
          </div>

          <div className="space-y-2">
            {proposals.map(p => (
              <div key={p.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium text-gray-900">{p.action_type}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLORS[p.risk_level]}`}>
                        {p.risk_level}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-sm text-gray-600 mb-1">{p.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Proposed {formatTime(p.proposed_at)} · Expires {formatTime(p.expires_at)}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDecision(p.id, 'approve')}
                      disabled={deciding === p.id}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {deciding === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleDecision(p.id, 'reject')}
                      disabled={deciding === p.id}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Log */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-indigo-600" />
          <h3 className="font-medium text-gray-900">Action Log</h3>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
            <Clock className="h-5 w-5 mx-auto mb-2" />
            No actions logged for this client yet
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {logs.map(entry => {
              const isExpanded = expandedRow === entry.id;
              return (
                <div key={entry.id}>
                  <button
                    onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                    }

                    {entry.status === 'success'
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      : <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    }

                    <span className="font-mono text-xs text-gray-700 flex-1 truncate">
                      {entry.action_type}
                    </span>

                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLORS[entry.risk_level]}`}>
                      {entry.risk_level}
                    </span>

                    <span className="text-xs text-gray-400 tabular-nums shrink-0">
                      {entry.duration_ms != null ? `${entry.duration_ms}ms` : ''}
                    </span>

                    <span className="text-xs text-gray-400 shrink-0 w-32 text-right">
                      {formatTime(entry.created_at)}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 pl-12 space-y-2">
                      {entry.error_message && (
                        <p className="text-sm text-red-600">Error: {entry.error_message}</p>
                      )}
                      <div className="text-xs">
                        <p className="text-gray-500 mb-1">Parameters:</p>
                        <pre className="bg-gray-50 rounded-lg p-2 overflow-x-auto text-gray-700">
                          {JSON.stringify(entry.parameters, null, 2)}
                        </pre>
                      </div>
                      {entry.result && (
                        <div className="text-xs">
                          <p className="text-gray-500 mb-1">Result:</p>
                          <pre className="bg-gray-50 rounded-lg p-2 overflow-x-auto text-gray-700 max-h-40">
                            {JSON.stringify(entry.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
