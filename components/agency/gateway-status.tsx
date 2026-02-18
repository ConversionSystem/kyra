'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Server, RefreshCw } from 'lucide-react';

interface GatewayHealth {
  status: string;
  appName?: string;
  gatewayUrl?: string;
  machineState?: string;
  error?: string;
  healthCheck?: {
    bridgeUp: boolean;
    gatewayConnected: boolean;
    activeSessions: number;
    uptime: number;
  };
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function GatewayStatus() {
  const [status, setStatus] = useState<GatewayHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/gateway/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Silently retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 15s if gateway is starting/provisioning
    const interval = setInterval(() => {
      if (status?.status === 'starting' || status?.status === 'provisioning' || status?.status === 'not_provisioned') {
        fetchStatus();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus, status?.status]);

  const handleProvision = async () => {
    setProvisioning(true);
    try {
      const res = await fetch('/api/agency/gateway/provision', { method: 'POST' });
      if (res.ok) {
        // Start polling
        setStatus({ status: 'provisioning' });
        const pollInterval = setInterval(async () => {
          const statusRes = await fetch('/api/agency/gateway/status');
          if (statusRes.ok) {
            const data = await statusRes.json();
            setStatus(data);
            if (data.status === 'running' || data.status === 'error') {
              clearInterval(pollInterval);
            }
          }
        }, 10000);
      }
    } catch {
      // Error handling
    } finally {
      setProvisioning(false);
    }
  };

  if (loading) return null;
  if (!status) return null;

  const isBooting = status.status === 'starting' || status.status === 'provisioning';
  const isRunning = status.status === 'running' && status.healthCheck?.gatewayConnected;
  const isError = status.status === 'error';
  const notProvisioned = status.status === 'not_provisioned' || status.status === 'pending';

  if (notProvisioned) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2">
                <Server className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-yellow-900">AI Gateway Not Provisioned</p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  Your dedicated OpenClaw instance needs to be created.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleProvision}
              disabled={provisioning}
              className="gap-2"
            >
              {provisioning && <Loader2 className="h-3 w-3 animate-spin" />}
              {provisioning ? 'Creating...' : 'Create Gateway'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isBooting) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="font-medium text-blue-900">AI Gateway Starting...</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Your dedicated AI instance is booting up. This takes about 2-3 minutes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-red-900">AI Gateway Error</p>
                <p className="text-xs text-red-700 mt-0.5">
                  {status.error || 'Something went wrong. Try restarting.'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetch('/api/agency/gateway/restart', { method: 'POST' }).then(fetchStatus)}
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Restart
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isRunning) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">AI Gateway Online</p>
              <p className="text-xs text-green-700 mt-0.5">
                {status.healthCheck?.activeSessions ?? 0} active session{(status.healthCheck?.activeSessions ?? 0) !== 1 ? 's' : ''}
                {status.healthCheck?.uptime ? ` · Uptime: ${formatUptime(status.healthCheck.uptime)}` : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback — unknown state
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-gray-400" />
          <p className="text-sm text-gray-500">Gateway status: {status.status}</p>
        </div>
      </CardContent>
    </Card>
  );
}
