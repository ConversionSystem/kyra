'use client';

import { useState, useEffect } from 'react';
import { Coins, AlertTriangle, Zap, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface CreditBadgeProps {
  creditsUsed: number;
  creditsLimit: number;
  plan: string;
}

export function CreditBadge({ creditsUsed, creditsLimit, plan }: CreditBadgeProps) {
  return (
    <Link
      href="/agency/api-keys"
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all bg-amber-100 text-amber-700 hover:bg-amber-200"
      title="Beta — Bring Your Own Keys"
    >
      <Sparkles className="h-3 w-3" />
      <span>Beta</span>
    </Link>
  );
}

interface CreditWarningBannerProps {
  creditsUsed: number;
  creditsLimit: number;
}

export function CreditWarningBanner({ creditsUsed, creditsLimit }: CreditWarningBannerProps) {
  // No credit warnings during beta — BYOK means users pay providers directly
  return null;
}
