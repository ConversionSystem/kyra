'use client';

import { useState } from 'react';
import { CREDIT_PACKS, type CreditPack } from '@/lib/billing/credits';
import type { CreditTransaction } from '@/lib/billing/credit-engine';
import {
  Coins, Zap, ShoppingBag, Gift, RotateCcw,
  CheckCircle2, AlertCircle, AlertTriangle, Crown,
  TrendingUp, MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Props {
  agencyId: string;
  balance: number;
  lifetimePurchased: number;
  lifetimeUsed: number;
  recentTransactions: CreditTransaction[];
  checkoutStatus: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function txIcon(type: string) {
  if (type === 'purchase') return <ShoppingBag className="h-4 w-4 text-indigo-500" />;
  if (type === 'usage') return <Zap className="h-4 w-4 text-gray-400" />;
  if (type === 'bonus') return <Gift className="h-4 w-4 text-purple-500" />;
  if (type === 'refund') return <RotateCcw className="h-4 w-4 text-green-500" />;
  return <Coins className="h-4 w-4 text-gray-400" />;
}

export function CreditsClient({
  balance,
  lifetimePurchased,
  lifetimeUsed,
  recentTransactions,
  checkoutStatus,
}: Props) {
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLow = balance < 100;

  const handleBuy = async (pack: CreditPack) => {
    setLoadingPack(pack.id);
    setError(null);
    try {
      const res = await fetch('/api/stripe/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: pack.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Coins className="h-5 w-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Kyra Credits</h1>
        </div>
        <p className="text-sm text-gray-500">
          Power your AI employees. 1 credit = 1 AI conversation.
        </p>
      </div>

      {/* Checkout status */}
      {checkoutStatus === 'success' && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <div>
            <p className="font-semibold">Payment successful — credits added to your balance! 🎉</p>
            <p className="text-xs text-green-600 mt-0.5">Your AI employees are ready to go.</p>
          </div>
        </div>
      )}
      {checkoutStatus === 'cancelled' && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <p>Checkout cancelled. No charge was made.</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Low balance warning */}
      {isLow && balance >= 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p>
            <strong>Running low</strong> — {balance} credit{balance !== 1 ? 's' : ''} remaining.
            Top up below to keep your AI employees responding.
          </p>
        </div>
      )}

      {/* Balance card */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0">
              <Coins className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide">Current Balance</p>
              <p className="text-4xl font-black text-gray-900">
                {balance.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                ~{balance.toLocaleString()} conversations remaining
              </p>
            </div>
          </div>

          <div className="flex items-center gap-8 ml-auto flex-wrap">
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-xs">Lifetime purchased</span>
              </div>
              <p className="text-xl font-bold text-gray-800">{lifetimePurchased.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-xs">Conversations powered</span>
              </div>
              <p className="text-xl font-bold text-gray-800">{lifetimeUsed.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pack section */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Top up your credits</h2>
        <p className="text-sm text-gray-500 mb-4">
          One-time purchase — credits never expire. Bigger packs = more bonus credits free.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {CREDIT_PACKS.map((pack) => (
            <Card
              key={pack.id}
              className={`relative flex flex-col transition-all ${
                pack.highlighted
                  ? 'border-indigo-300 shadow-lg shadow-indigo-100 scale-[1.02]'
                  : 'hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {pack.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow">
                    <Crown className="h-3 w-3" /> Best Value
                  </span>
                </div>
              )}

              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-sm font-semibold text-gray-700">{pack.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-gray-900">${pack.price}</span>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-lg font-bold text-indigo-700">
                    {pack.totalCredits.toLocaleString()} credits
                  </p>
                  {pack.bonusPct > 0 && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${pack.badgeColor}`}>
                      +{pack.bonusPct}% bonus
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0 flex flex-col flex-1 gap-3">
                <CardDescription className="text-xs text-gray-400">
                  ~{pack.totalCredits.toLocaleString()} AI conversations
                </CardDescription>
                <p className="text-xs text-gray-500 flex-1">{pack.description}</p>
                <Button
                  onClick={() => handleBuy(pack)}
                  disabled={!!loadingPack}
                  className={`w-full mt-auto ${pack.highlighted ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                  variant={pack.highlighted ? 'default' : 'outline'}
                  size="sm"
                >
                  {loadingPack === pack.id ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Processing…</>
                  ) : (
                    `Buy for $${pack.price}`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      {recentTransactions.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Recent Activity</h2>
          <Card>
            <CardContent className="pt-4 pb-2">
              <div className="divide-y divide-gray-50">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5">
                    <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                      {txIcon(tx.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${
                      tx.amount > 0 ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">How credits work</p>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            { icon: '🤖', t: '1 credit = 1 conversation', d: 'Each AI reply to a customer uses 1 credit, regardless of model.' },
            { icon: '📦', t: 'Never expire', d: 'Credits roll over indefinitely. Buy once, use anytime.' },
            { icon: '⚡', t: 'Auto-routed', d: 'Kyra automatically uses the most cost-efficient model for each task.' },
            { icon: '📊', t: 'Per-client tracking', d: 'See exactly how many conversations each client\'s AI has powered.' },
          ].map((item) => (
            <div key={item.t} className="flex gap-3">
              <span className="text-lg leading-5">{item.icon}</span>
              <div>
                <p className="font-medium text-gray-700">{item.t}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
