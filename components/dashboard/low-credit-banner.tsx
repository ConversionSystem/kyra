'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, X } from 'lucide-react';

interface Props {
  balance: number;
  threshold?: number; // show when balance <= threshold (default 10)
}

export default function LowCreditBanner({ balance, threshold = 10 }: Props) {
  const [dismissed, setDismissed] = useState(false);

  // Key changes when balance crosses threshold — banner re-appears
  const storageKey = `low-credit-dismissed-lte${threshold}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(localStorage.getItem(storageKey) === 'true');
  }, [storageKey]);

  // Only show when balance is low but not zero (zero gets the credit wall modal)
  if (balance === 0 || balance > threshold || dismissed) return null;

  const urgency = balance <= 3 ? 'critical' : 'low';

  const styles =
    urgency === 'critical'
      ? {
          wrap: 'bg-red-50 border border-red-200 text-red-800',
          badge: 'bg-red-100 text-red-700',
          btn: 'bg-red-600 hover:bg-red-700 text-white',
          icon: 'text-red-500',
        }
      : {
          wrap: 'bg-amber-50 border border-amber-200 text-amber-800',
          badge: 'bg-amber-100 text-amber-700',
          btn: 'bg-amber-600 hover:bg-amber-700 text-white',
          icon: 'text-amber-500',
        };

  const dismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  };

  return (
    <div className={`${styles.wrap} rounded-xl px-4 py-3 mb-5 flex items-center gap-3 relative`}>
      {/* Icon */}
      <Zap className={`h-5 w-5 shrink-0 ${styles.icon}`} />

      {/* Badge */}
      <span className={`${styles.badge} text-xs font-bold px-2 py-0.5 rounded-full shrink-0`}>
        {balance} credit{balance !== 1 ? 's' : ''} left
      </span>

      {/* Message */}
      <p className="flex-1 text-sm font-medium min-w-0">
        {urgency === 'critical'
          ? 'Almost out — your AI will pause when credits hit zero.'
          : 'Running low — top up to keep your AI running without interruption.'}
      </p>

      {/* CTA */}
      <Link
        href="/agency/credits"
        className={`${styles.btn} text-sm font-semibold px-4 py-1.5 rounded-lg transition shrink-0`}
      >
        Buy Credits
      </Link>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="text-current opacity-40 hover:opacity-70 transition shrink-0 ml-1"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
