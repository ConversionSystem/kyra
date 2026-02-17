'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Client component that checks for ?plan= param after OAuth redirect
 * and triggers Stripe Checkout if a paid plan was selected.
 */
export function PlanRedirect() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const triggered = useRef(false);

  useEffect(() => {
    if (!plan || !['starter', 'business', 'max'].includes(plan) || triggered.current) return;
    triggered.current = true;

    (async () => {
      try {
        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        });
        const data = (await res.json()) as any;
        if (data.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        console.error('Failed to redirect to checkout:', err);
      }
    })();
  }, [plan]);

  if (!plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-gray-700">Redirecting to checkout...</p>
      </div>
    </div>
  );
}
