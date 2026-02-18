'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ToolsClient() {
  const [gatewayStatus, setGatewayStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Fetch health + dashboard URL in parallel
    Promise.all([
      fetch('/api/openclaw/health').then((r) => r.json()).catch(() => ({ connected: false })),
      fetch('/api/openclaw/dashboard-url').then((r) => r.json()).catch(() => ({})),
    ]).then(([health, dashboard]) => {
      setGatewayStatus(health.connected ? 'connected' : 'disconnected');
      if (dashboard.url) setDashboardUrl(dashboard.url);
    });
  }, []);

  if (gatewayStatus === 'checking') {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          <p className="text-gray-400">Connecting to OpenClaw Gateway...</p>
        </div>
      </div>
    );
  }

  if (gatewayStatus === 'disconnected') {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-4 max-w-md">
          <XCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Gateway Offline</h2>
          <p className="text-gray-400">
            The AI engine is starting up. This usually takes 1-2 minutes after a deployment.
            Please refresh in a moment.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="mt-4"
          >
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col',
      isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'h-[calc(100vh-4rem)] lg:h-screen'
    )}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-xs font-medium text-green-400">OpenClaw Connected</span>
          </div>
          <span className="text-gray-600">|</span>
          <span className="text-xs text-gray-400">
            Full Gateway Dashboard — Chat, Sessions, Tools, Skills, Config & more
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dashboardUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(dashboardUrl, '_blank')}
              className="text-gray-400 hover:text-white h-7 px-2"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline text-xs">Open in new tab</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-400 hover:text-white h-7 px-2"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Embedded Gateway Dashboard */}
      {dashboardUrl ? (
        <iframe
          src={dashboardUrl}
          className="flex-1 w-full border-0"
          allow="clipboard-read; clipboard-write; microphone"
          title="OpenClaw Gateway Dashboard"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
