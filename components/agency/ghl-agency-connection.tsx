'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, Loader2, Unplug, RefreshCw, ExternalLink,
} from 'lucide-react';

interface GHLStatus {
  connected: boolean;
  companyId: string | null;
  connectedAt: string | null;
  expiresAt: string | null;
  isExpired: boolean;
}

export function GHLAgencyConnection() {
  const [status, setStatus] = useState<GHLStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/ghl/status');
      if (res.ok) setStatus(await res.json());
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/agency/ghl/disconnect', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error || 'Failed to disconnect');
      }
      await fetchStatus();
      setConfirmDisconnect(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
            <span className="text-lg font-bold text-orange-600">G</span>
          </div>
          GoHighLevel Agency Connection
          {status?.connected && !status.isExpired && (
            <span className="ml-2 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Connected
            </span>
          )}
          {status?.connected && status.isExpired && (
            <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Token Expired
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Connect your GHL agency account once — Kyra will automatically create GoHighLevel
          sub-accounts for new clients without any manual setup.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking connection…
          </div>
        ) : status?.connected && !status.isExpired ? (
          /* ── Connected ────────────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-green-700 text-sm">GHL agency account connected</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Kyra can now create GHL sub-accounts automatically for your clients.
                </p>
              </div>
            </div>

            <div className="grid gap-2.5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
              {status.companyId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Company ID</span>
                  <span className="font-mono text-xs text-gray-700">{status.companyId}</span>
                </div>
              )}
              {status.connectedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Connected</span>
                  <span className="text-gray-700">
                    {new Date(status.connectedAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Capability</span>
                <span className="text-gray-700">Create GHL sub-accounts for clients</span>
              </div>
            </div>

            {confirmDisconnect ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
                <p className="text-sm text-red-700 font-medium">
                  Disconnect GHL? Kyra will no longer be able to create sub-accounts automatically.
                  Existing client connections are not affected.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="text-red-600 border-red-200 hover:bg-red-100 gap-1.5"
                  >
                    {disconnecting
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Unplug className="h-3.5 w-3.5" />}
                    {disconnecting ? 'Disconnecting…' : 'Yes, disconnect'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDisconnect(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { window.location.href = '/api/agency/ghl/connect'; }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reconnect
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDisconnect(true)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-600 border-red-500/30 hover:border-red-200 hover:bg-red-50"
                >
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* ── Not Connected (or expired) ───────────────────────────────── */
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-4 py-3">
              <XCircle className="h-5 w-5 text-gray-400 shrink-0" />
              <span className="text-gray-500 text-sm">
                {status?.isExpired ? 'Token expired — reconnect to restore access.' : 'Not connected'}
              </span>
            </div>

            <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">Connect GHL Agency Account</h3>
              <p className="text-sm text-gray-600">
                Authorize Kyra to create GoHighLevel sub-accounts on your behalf.
                You&apos;ll be redirected to GHL to approve access — takes about 30 seconds.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                <li>One-time setup — no manual sub-account creation</li>
                <li>Kyra provisions GHL automatically when you add a client</li>
                <li>Your existing client connections are not affected</li>
              </ul>
              <Button
                onClick={() => { window.location.href = '/api/agency/ghl/connect'; }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Connect GHL Agency Account
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
