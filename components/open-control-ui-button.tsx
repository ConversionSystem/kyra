'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OpenControlUIButton() {
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/openclaw/dashboard-url')
      .then((r) => r.json())
      .then((data) => { if (data.url) setDashboardUrl(data.url); })
      .catch(() => {});
  }, []);

  return (
    <Button
      size="sm"
      className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
      onClick={() => {
        if (dashboardUrl) window.open(dashboardUrl, '_blank');
        else window.open('/agency/tools', '_self');
      }}
      disabled={!dashboardUrl}
    >
      {!dashboardUrl ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ExternalLink className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">Open Control UI</span>
      <span className="sm:hidden">Control UI</span>
    </Button>
  );
}
