'use client';

import { useEffect } from 'react';
import { Coins, AlertTriangle, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePolling } from '@/hooks/use-polling';

interface CreditBadgeProps {
  className?: string;
}

async function fetchCredits(): Promise<number> {
  const res = await fetch('/api/agency/credits');
  if (!res.ok) return 0;
  const data = await res.json();
  return data.balance ?? 0;
}

export function CreditBadge({ className = '' }: CreditBadgeProps) {
  const { data: balance, loading, refetch } = usePolling<number>({
    key: 'credits',
    fetcher: fetchCredits,
    intervalMs: 15_000,
  });

  // Also listen for custom credit-update events (fired by chat components)
  useEffect(() => {
    const handleCreditUpdate = () => { refetch(); };
    window.addEventListener('kyra:credit-update', handleCreditUpdate);
    return () => window.removeEventListener('kyra:credit-update', handleCreditUpdate);
  }, [refetch]);

  if (loading || balance === null) return null;

  const isLow = balance < 50;
  const isEmpty = balance <= 0;

  return (
    <Link
      href="/agency/credits"
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
        isEmpty
          ? 'bg-red-100 text-red-700 hover:bg-red-200 animate-pulse'
          : isLow
            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
      } ${className}`}
      title={isEmpty ? 'No credits — add more to continue' : `${balance} credits remaining`}
    >
      {isEmpty ? (
        <><AlertTriangle className="h-3 w-3" /> 0 credits</>
      ) : isLow ? (
        <><Zap className="h-3 w-3" /> {balance} credits</>
      ) : (
        <><Coins className="h-3 w-3" /> {balance}</>
      )}
    </Link>
  );
}

export function CreditWarningBanner() {
  const { data: balance } = usePolling<number>({
    key: 'credits',
    fetcher: fetchCredits,
    intervalMs: 15_000,
  });

  if (balance === null || balance > 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mx-4 mb-3 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">No credits remaining</p>
        <p className="text-xs text-red-600">AI features are paused. Add credits to resume.</p>
      </div>
      <Link
        href="/agency/credits"
        className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition whitespace-nowrap"
      >
        Add Credits
      </Link>
    </div>
  );
}
