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
    // OpenClaw Control UI reads the token from the HASH fragment (#token=)
    // NOT from the query string (?token=). Hash fragments are never sent
    // to the server and survive cross-origin navigation on iOS Safari.
    const url = `${dashboardUrl}#token=${encodeURIComponent(token)}`;
    // Open in new tab so the Kyra dashboard stays open
    const newTab = window.open(url, '_blank', 'noopener,noreferrer');
    // If popup was blocked (iOS Safari), fall back to same-tab navigation
    if (!newTab) {
      window.location.href = url;
    } else {
      // Go back to the previous page (Kyra dashboard)
      window.history.back();
    }
  }, [dashboardUrl, token]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-4" />
      <p className="text-lg font-semibold">Opening terminal...</p>
      <p className="text-sm text-gray-400 mt-2">Connecting to AI worker</p>
    </div>
  );
}
