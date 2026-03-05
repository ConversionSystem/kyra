'use client';

import { useState, useEffect } from 'react';
import { Zap, Coins, X, Copy, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface ReferralNudgeProps {
  balance: number;
  agencyCreatedAt: string;
  referralUrl?: string;
}

export function ReferralNudge({ balance, agencyCreatedAt, referralUrl }: ReferralNudgeProps) {
  const [showLowCredits, setShowLowCredits] = useState(false);
  const [showEarlyBird, setShowEarlyBird] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [copied, setCopied] = useState(false);

  const earlyBirdExpiresAt = new Date(agencyCreatedAt).getTime() + 48 * 3_600_000;
  const isEarlyBird = Date.now() < earlyBirdExpiresAt;

  useEffect(() => {
    // Low credits nudge: show if balance < 50, not dismissed
    if (balance < 50 && balance >= 0) {
      const dismissed = localStorage.getItem('kyra_nudge_lowcredits_dismissed');
      if (!dismissed) setShowLowCredits(true);
    }

    // Early bird nudge: show only in first 48h, once per session
    if (isEarlyBird) {
      const shown = sessionStorage.getItem('kyra_earlybird_nudge_shown');
      if (!shown) {
        sessionStorage.setItem('kyra_earlybird_nudge_shown', '1');
        setShowEarlyBird(true);
      }
    }
  }, [balance, isEarlyBird]);

  // Countdown for early bird
  useEffect(() => {
    if (!showEarlyBird) return;
    const tick = () => {
      const diff = earlyBirdExpiresAt - Date.now();
      if (diff <= 0) { setShowEarlyBird(false); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setTimeLeft(`${h}h ${String(m).padStart(2, '0')}m`);
    };
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [showEarlyBird, earlyBirdExpiresAt]);

  const copyLink = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const dismissLowCredits = () => {
    localStorage.setItem('kyra_nudge_lowcredits_dismissed', '1');
    setShowLowCredits(false);
  };

  if (!showEarlyBird && !showLowCredits) return null;

  return (
    <div className="space-y-3 mb-4">
      {/* Early Bird nudge */}
      {showEarlyBird && (
        <div className="relative flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              ⚡ Early Bird: <span className="text-indigo-700">{timeLeft} left</span>
            </p>
            <p className="text-xs text-gray-500">Refer now → 150 credits each (drops to 100 after timer)</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {referralUrl && (
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition"
              >
                {copied ? <><CheckCircle2 className="h-3 w-3" />Copied!</> : <><Copy className="h-3 w-3" />Copy link</>}
              </button>
            )}
            <button
              onClick={() => setShowEarlyBird(false)}
              className="p-1 text-gray-400 hover:text-gray-600 transition rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Low credits nudge */}
      {showLowCredits && (
        <div className="relative flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Coins className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Running low on AI credits</p>
            <p className="text-xs text-gray-500">Refer a friend and you both get 100 free credits — no purchase needed.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/agency/referrals"
              className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition whitespace-nowrap"
            >
              Get free credits →
            </Link>
            <button
              onClick={dismissLowCredits}
              className="p-1 text-gray-400 hover:text-gray-600 transition rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
