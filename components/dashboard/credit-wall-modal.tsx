'use client';

import { useState } from 'react';
import { Zap, CreditCard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  highlight?: boolean;
}

const PACKS: CreditPack[] = [
  { id: 'starter',  name: 'Lite',     credits: 500,   price: 10 },
  { id: 'pro',      name: 'Pro',      credits: 1500,  price: 25, highlight: true },
  { id: 'growth',   name: 'Growth',   credits: 3500,  price: 50 },
];

interface Props {
  agencyId: string;
}

export default function CreditWallModal({ agencyId: _agencyId }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(packId: string) {
    setLoading(packId);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId,
          successUrl: window.location.href,
          cancelUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(null);
    }
  }

  return (
    /* Fixed full-screen overlay — not dismissible */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 text-center">

        {/* Status badge */}
        <div className="flex justify-center mb-4">
          <Badge className="bg-red-100 text-red-700 border-red-200 px-3 py-1 text-sm font-semibold gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            AI Paused
          </Badge>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-gray-100 rounded-full p-4">
            <Zap className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your AI is paused</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          You&apos;ve used all your credits. Add credits now to get your AI worker back online immediately.
        </p>

        {/* Credit packs */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => handleBuy(pack.id)}
              disabled={loading !== null}
              className={`
                relative rounded-xl border-2 p-4 text-left transition
                ${pack.highlight
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'}
                ${loading !== null ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
              `}
            >
              {pack.highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  POPULAR
                </span>
              )}

              <p className="text-xs font-semibold text-gray-500 mb-1">{pack.name}</p>
              <p className="text-lg font-black text-gray-900">${pack.price}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {pack.credits.toLocaleString()} credits
              </p>

              {loading === pack.id ? (
                <div className="mt-3 flex justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                </div>
              ) : (
                <div className={`mt-3 text-xs font-semibold ${pack.highlight ? 'text-indigo-600' : 'text-gray-600'}`}>
                  Get started →
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        {/* Fine print */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Credits never expire · Secure checkout via Stripe</span>
        </div>

        {/* Link to full credits page */}
        <p className="mt-4 text-xs text-gray-400">
          Need more?{' '}
          <a href="/agency/credits" className="text-indigo-500 hover:underline font-medium">
            View all credit packs →
          </a>
        </p>
      </div>
    </div>
  );
}
