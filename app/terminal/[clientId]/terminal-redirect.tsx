'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  dashboardUrl: string;
  token: string;
  gatewayUrl: string;
}

/**
 * Client component that navigates to the OpenClaw terminal.
 *
 * Strategy: pass token via ?token= in the URL — OpenClaw reads it on load
 * and saves to sessionStorage. Use window.location.href (same tab) instead
 * of window.open (blocked by iOS Safari popup blocker after async).
 *
 * Same-tab navigation preserves the ?token= param reliably on mobile.
 */
export default function TerminalRedirect({ dashboardUrl, token, gatewayUrl }: Props) {
  useEffect(() => {
    const url = `${dashboardUrl}?token=${encodeURIComponent(token)}`;
    // Use location.href (same tab) — never blocked by iOS Safari
    // and does not strip params like cross-origin window.open can
    window.location.href = url;
  }, [dashboardUrl, token]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-4" />
      <p className="text-lg font-semibold">Opening terminal...</p>
      <p className="text-sm text-gray-400 mt-2">Connecting to AI worker</p>
    </div>
  );
}
