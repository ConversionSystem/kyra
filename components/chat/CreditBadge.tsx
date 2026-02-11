'use client';

import { useState, useEffect } from 'react';
import { Coins, AlertTriangle, Zap } from 'lucide-react';
import Link from 'next/link';

interface CreditBadgeProps {
  creditsUsed: number;
  creditsLimit: number;
  plan: string;
}

export function CreditBadge({ creditsUsed, creditsLimit, plan }: CreditBadgeProps) {
  const remaining = Math.max(0, creditsLimit - creditsUsed);
  const percentage = creditsLimit > 0 ? (creditsUsed / creditsLimit) * 100 : 100;
  const isLow = percentage >= 90;
  const isZero = remaining <= 0;

  return (
    <Link
      href="/settings"
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
        isZero
          ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30 animate-pulse'
          : isLow
          ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
      }`}
      title={`${remaining} credits remaining (${plan} plan)`}
    >
      {isZero ? (
        <AlertTriangle className="h-3 w-3" />
      ) : isLow ? (
        <Zap className="h-3 w-3" />
      ) : (
        <Coins className="h-3 w-3" />
      )}
      <span>{remaining}</span>
    </Link>
  );
}

interface CreditWarningBannerProps {
  creditsUsed: number;
  creditsLimit: number;
}

export function CreditWarningBanner({ creditsUsed, creditsLimit }: CreditWarningBannerProps) {
  const remaining = Math.max(0, creditsLimit - creditsUsed);
  const percentage = creditsLimit > 0 ? (creditsUsed / creditsLimit) * 100 : 100;
  const isLow = percentage >= 90 && remaining > 0;
  const isZero = remaining <= 0;

  if (!isLow && !isZero) return null;

  return (
    <div
      className={`mx-auto max-w-3xl px-4 py-2 text-center text-sm ${
        isZero
          ? 'bg-red-500/10 text-red-400'
          : 'bg-amber-500/10 text-amber-400'
      }`}
    >
      {isZero ? (
        <span>
          You&apos;ve used all your credits.{' '}
          <Link href="/settings" className="underline font-medium hover:text-red-300">
            Upgrade your plan
          </Link>{' '}
          to continue chatting.
        </span>
      ) : (
        <span>
          ⚡ Only {remaining} credits remaining.{' '}
          <Link href="/settings" className="underline font-medium hover:text-amber-300">
            Upgrade
          </Link>{' '}
          for more.
        </span>
      )}
    </div>
  );
}
