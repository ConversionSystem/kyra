'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Check,
  X,
  ExternalLink,
  Loader2,
  Unplug,
  Plug,
  RefreshCw,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface GHLConnectionProps {
  clientId: string;
  ghlLocationId: string | null;
  ghlConnectedAt: string | null;
  onDisconnected?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function GHLConnection({
  clientId,
  ghlLocationId,
  ghlConnectedAt,
  onDisconnected,
}: GHLConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);

  const isConnected = !!ghlLocationId && !disconnected;

  const handleConnect = useCallback(() => {
    setIsConnecting(true);
    setError(null);
    // Redirect to the OAuth initiation endpoint
    window.location.href = `/api/agency/clients/${clientId}/ghl/connect`;
  }, [clientId]);

  const handleDisconnect = useCallback(async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect GoHighLevel? The AI will lose access to the CRM.',
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/agency/clients/${clientId}/ghl/disconnect`,
        { method: 'POST' },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || 'Failed to disconnect',
        );
      }

      setDisconnected(true);
      onDisconnected?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to disconnect',
      );
    } finally {
      setIsDisconnecting(false);
    }
  }, [clientId, onDisconnected]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {/* GHL logo placeholder */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
            <span className="text-lg font-bold text-orange-400">G</span>
          </div>
          GoHighLevel Integration
        </CardTitle>
        <CardDescription>
          Connect this client&apos;s GHL sub-account to enable CRM features —
          contacts, conversations, pipeline, calendar, and workflows.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {isConnected ? (
          /* ── Connected State ──────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
              <Check className="h-5 w-5 text-green-400" />
              <span className="font-medium text-green-400">Connected</span>
            </div>

            <div className="grid gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Location ID</span>
                <span className="font-mono text-xs text-zinc-300">
                  {ghlLocationId}
                </span>
              </div>
              {ghlConnectedAt && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Connected</span>
                  <span className="text-zinc-300">
                    {new Date(ghlConnectedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-400">Capabilities</span>
                <span className="text-zinc-300">
                  Contacts · Conversations · Pipeline · Calendar · Workflows
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reconnect
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10"
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unplug className="h-4 w-4" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          /* ── Disconnected State ───────────────────────────────────────── */
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
              <X className="h-5 w-5 text-zinc-500" />
              <span className="text-zinc-400">Not connected</span>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4 text-sm text-zinc-400 space-y-2">
              <p>
                Connecting GoHighLevel unlocks the AI&apos;s full CRM
                capabilities:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-500">
                <li>Read & update contacts, tags, and custom fields</li>
                <li>
                  Send messages via SMS, email, and WhatsApp through GHL
                </li>
                <li>Manage the sales pipeline and move deals</li>
                <li>Check calendar availability and book appointments</li>
                <li>Trigger GHL automation workflows</li>
              </ul>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Plug className="h-4 w-4" />
                  Connect GoHighLevel
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
