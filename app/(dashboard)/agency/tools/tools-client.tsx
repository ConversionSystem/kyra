'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Maximize2, Minimize2, Terminal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function ToolsClient() {
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetch('/api/openclaw/dashboard-url')
      .then((r) => r.json())
      .then((data) => {
        if (data.url) setDashboardUrl(data.url);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-3">
          <Terminal className="h-8 w-8 text-gray-500 mx-auto animate-pulse" />
          <p className="text-sm text-gray-500">Connecting to gateway...</p>
        </div>
      </div>
    );
  }

  // No gateway provisioned
  if (!dashboardUrl) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-4 max-w-sm">
          <Terminal className="h-12 w-12 text-gray-600 mx-auto" />
          <h2 className="text-lg font-semibold text-white">OpenClaw Terminal</h2>
          <p className="text-sm text-gray-400">
            No AI gateway is running yet. Deploy your first client AI to access the full
            OpenClaw terminal — chat, sessions, cron jobs, skills, config and more.
          </p>
          <Button asChild className="mt-2">
            <Link href="/agency/clients">
              <Users className="h-4 w-4 mr-2" />
              Go to Clients
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Gateway available — embed it
  return (
    <div className={cn(
      'flex flex-col',
      isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'h-[calc(100vh-4rem)] lg:h-screen'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-green-400" />
          <span className="text-xs font-medium text-green-400">OpenClaw Terminal</span>
          <span className="text-gray-600 mx-1">|</span>
          <span className="text-xs text-gray-400">Chat · Sessions · Skills · Config · Cron</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(dashboardUrl, '_blank')}
            className="text-gray-400 hover:text-white h-7 px-2"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline text-xs">Pop out</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-400 hover:text-white h-7 px-2"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Embedded Terminal */}
      <iframe
        src={dashboardUrl}
        className="flex-1 w-full border-0"
        allow="clipboard-read; clipboard-write; microphone"
        title="OpenClaw Gateway Dashboard"
      />
    </div>
  );
}
