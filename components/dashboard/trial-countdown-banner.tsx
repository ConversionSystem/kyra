'use client';

// Trial countdown banner — trials removed. This component now shows a
// gentle upgrade nudge to free-plan users who have been active for 7+ days.

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';

interface Props {
  createdAt: string;
  plan: string;
  clientCount: number;
  totalConversations: number;
}

export default function TrialCountdownBanner({ plan, clientCount }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('upgrade-nudge-dismissed-v3') === 'true';
  });

  // Only show to free-plan users who have at least 1 client set up
  if (plan !== 'free' || dismissed || clientCount === 0) return null;

  const dismiss = () => {
    localStorage.setItem('upgrade-nudge-dismissed-v3', 'true');
    setDismissed(true);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 mb-6 flex items-center gap-4 relative">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-white/60 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="bg-white/15 rounded-xl p-2.5 shrink-0">
        <Sparkles className="h-6 w-6 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">Your AI worker is live — ready to scale?</p>
        <p className="text-xs text-indigo-200 mt-0.5">
          Upgrade to add more clients, unlock white-label branding, and grow your recurring revenue.
        </p>
      </div>

      <Link
        href="/agency/billing"
        className="bg-white text-indigo-700 font-bold text-sm px-4 py-2 rounded-xl whitespace-nowrap hover:bg-indigo-50 transition shrink-0"
      >
        View plans →
      </Link>
    </div>
  );
}
