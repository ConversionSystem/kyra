'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Server, Loader2 } from 'lucide-react';

interface ClientGateway {
  id: string;
  name: string;
  slug: string;
  status: string;
  gateway: {
    url: string | null;
    status: string;
    containerId: string | null;
    error: string | null;
    provisionedAt: string | null;
  };
}

interface GatewayStatusResponse {
  architecture: string;
  vps: { healthy: boolean; containers?: number } | null;
  clients: ClientGateway[];
}

export function GatewayStatus() {
  const [data, setData] = useState<GatewayStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/gateway/status');
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading) return null;
  if (!data?.clients?.length) return null;

  const running = data.clients.filter(c => c.gateway.status === 'running').length;
  const total = data.clients.length;
  const hasErrors = data.clients.some(c => c.gateway.status === 'error');
  const notProvisioned = data.clients.filter(c => c.gateway.status === 'not_provisioned' || !c.gateway.url).length;

  // All running
  if (running === total) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">All AI Gateways Online</p>
              <p className="text-xs text-green-700 mt-0.5">
                {running} client{running !== 1 ? 's' : ''} running on isolated infrastructure
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Some issues
  if (hasErrors || notProvisioned > 0) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-yellow-900">
                {running}/{total} AI Gateways Online
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                {notProvisioned > 0 && `${notProvisioned} need setup`}
                {hasErrors && notProvisioned > 0 && ' · '}
                {hasErrors && 'Some have errors'}
                {' — check individual clients for details'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mixed — some starting
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Server className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-900">
              {running}/{total} AI Gateways Online
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Some gateways are starting up
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
