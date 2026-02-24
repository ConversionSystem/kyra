'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Activity, Server, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface UltronClient {
  id: string;
  name: string;
  slug: string;
  status: string;
  gatewayStatus: string | null;
  gatewayError: string | null;
  convosLast7d: number;
  lastConversationAt: string | null;
  avgResponseMsLast7d: number | null;
  riskLevel: 'ok' | 'warning' | 'critical';
  riskReasons: string[];
}

interface UltronSummary {
  agencyId: string;
  generatedAt: string;
  summary: {
    totalClients: number;
    activeClients: number;
    clientsWithConvosLast7d: number;
    totalConvosLast7d: number;
    avgResponseMsLast7d: number | null;
    gateways: {
      running: number;
      notRunning: number;
    };
  };
  clients: UltronClient[];
  atRisk: UltronClient[];
}

export function UltronSummaryCard() {
  const [data, setData] = useState<UltronSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/agency/ultron/summary', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load agency brief');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // If there are no clients yet, don't render anything
  if (!loading && !error && data && data.summary.totalClients === 0) {
    return null;
  }

  return (
    <Card className="mb-6 border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/40">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-600 text-white p-1.5">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-gray-900">Agency Ops Brief</CardTitle>
            <p className="text-[11px] text-gray-500">Powered by your Agency Ops Brain role</p>
          </div>
        </div>
        {loading && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading…</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 mt-0.5" />
            <span>Ultron brief unavailable right now. {error}</span>
          </div>
        )}

        {!error && data && (
          <div className="space-y-3">
            {/* Top row: high-level stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Clients</p>
                <p className="text-sm font-semibold text-gray-900">
                  {data.summary.activeClients} active
                  <span className="text-[11px] text-gray-400"> / {data.summary.totalClients} total</span>
                </p>
              </div>
              <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">At risk</p>
                <p className="text-sm font-semibold text-amber-700 flex items-center gap-1">
                  {data.atRisk.length}
                  {data.atRisk.length > 0 && <AlertTriangle className="h-3 w-3" />}
                </p>
              </div>
              <div className="rounded-lg bg-white border border-gray-100 px-3 py-2 flex items-center gap-2">
                <div className="rounded-md bg-green-50 p-1 border border-green-100">
                  <Server className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Gateways</p>
                  <p className="text-xs font-semibold text-gray-900">
                    {data.summary.gateways.running} running
                    <span className="text-[11px] text-gray-400"> / {data.summary.gateways.notRunning} not running</span>
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Last 7 days</p>
                <p className="text-xs font-semibold text-gray-900">
                  {data.summary.totalConvosLast7d.toLocaleString()} conversations
                </p>
                <p className="text-[11px] text-gray-400">
                  Avg response {data.summary.avgResponseMsLast7d != null ? `${data.summary.avgResponseMsLast7d} ms` : 'n/a'}
                </p>
              </div>
            </div>

            {/* At-risk list */}
            {data.atRisk.length > 0 && (
              <div className="mt-1">
                <p className="text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  Clients to check first
                </p>
                <div className="space-y-1.5">
                  {data.atRisk.slice(0, 3).map((client) => (
                    <Link
                      key={client.id}
                      href={`/agency/clients/${client.id}`}
                      className="flex items-center justify-between rounded-md bg-white border border-amber-100 px-3 py-1.5 text-[11px] hover:border-amber-300 hover:bg-amber-50/60 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{client.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {client.riskReasons.join(' · ')}
                        </p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
                    </Link>
                  ))}
                  {data.atRisk.length > 3 && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      +{data.atRisk.length - 3} more at-risk clients — see full list via the Agency Ops Brain role.
                    </p>
                  )}
                </div>
              </div>
            )}

            {data.atRisk.length === 0 && !loading && (
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                <span className="text-green-500">✓</span>
                No clients currently flagged as at risk.
              </p>
            )}

            <p className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
              <span>
                Generated {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-gray-300">·</span>
              <span>Ask your "Agency Ops Brain" role for a full narrative brief.</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
