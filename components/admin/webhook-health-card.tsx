'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Webhook, Clock, Zap, ShieldCheck, ShieldAlert,
} from 'lucide-react';

interface WebhookHealth {
  healthy: boolean;
  endpoint: {
    id: string;
    url: string;
    status: string;
    enabledEvents: string[];
  } | null;
  recentEvents: {
    total: number;
    succeeded: number;
    failed: number;
    pending: number;
    oldestChecked: string | null;
    newestChecked: string | null;
  };
  alerts: string[];
  checkedAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function WebhookHealthCard() {
  const [health, setHealth] = useState<WebhookHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/webhook-health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHealth(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Refresh every 5 minutes
    const interval = setInterval(fetchHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading && !health) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Checking webhook health...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-semibold text-red-700">Webhook Health Check Failed</p>
          </div>
          <button onClick={fetchHealth} className="text-xs text-gray-500 hover:text-gray-700">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs text-red-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!health) return null;

  const isHealthy = health.healthy;
  const endpointEnabled = health.endpoint?.status === 'enabled';

  return (
    <div className={`bg-white rounded-xl border ${isHealthy ? 'border-gray-200' : 'border-red-300 bg-red-50/30'} p-5 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isHealthy ? (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" />
          )}
          <h3 className="text-sm font-bold text-gray-900">Stripe Webhook Health</h3>
          {isHealthy ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Healthy
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Issues Detected
            </span>
          )}
        </div>
        <button
          onClick={fetchHealth}
          className="text-gray-400 hover:text-gray-600 transition"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Alerts */}
      {health.alerts.length > 0 && (
        <div className="space-y-1.5">
          {health.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* Status Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Endpoint Status */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Webhook className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Endpoint</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            {endpointEnabled ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm font-bold ${endpointEnabled ? 'text-emerald-700' : 'text-red-700'}`}>
              {health.endpoint?.status?.toUpperCase() ?? 'UNKNOWN'}
            </span>
          </div>
        </div>

        {/* Events (24h) */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Events 24h</span>
          </div>
          <p className="text-sm font-bold text-gray-900 tabular-nums">{health.recentEvents.total}</p>
          {health.recentEvents.total > 0 && (
            <p className="text-[10px] text-gray-400">
              {health.recentEvents.succeeded} delivered
              {health.recentEvents.pending > 0 && ` · ${health.recentEvents.pending} pending`}
            </p>
          )}
        </div>

        {/* Last Event */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Last Event</span>
          </div>
          <p className="text-sm font-bold text-gray-900">
            {health.recentEvents.newestChecked ? timeAgo(health.recentEvents.newestChecked) : 'None'}
          </p>
        </div>
      </div>

      {/* Registered Events */}
      {health.endpoint && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 mb-1.5">Registered events ({health.endpoint.enabledEvents.length})</p>
          <div className="flex flex-wrap gap-1">
            {health.endpoint.enabledEvents.map(evt => (
              <span key={evt} className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 font-mono">
                {evt}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px] text-gray-300 text-right">
        Checked {health.checkedAt ? timeAgo(health.checkedAt) : 'never'}
      </p>
    </div>
  );
}
