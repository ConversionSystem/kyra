'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, X } from 'lucide-react';

interface Props {
  createdAt: string;
  plan: string;
  clientCount: number;
  totalConversations: number;
}

export default function TrialCountdownBanner({ createdAt, plan, clientCount, totalConversations }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only suppress if they explicitly dismissed this specific trial window
    const key = `trial-banner-dismissed-v2`;
    if (localStorage.getItem(key) === 'true') setDismissed(true);
  }, []);

  // Only show for free plan agencies
  if (plan !== 'free' || dismissed) return null;

  const daysSinceSignup = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  const trialDays = 30;
  const daysLeft = Math.max(0, trialDays - daysSinceSignup);

  // Don't show before day 7 or after trial ends
  if (daysSinceSignup < 7 || daysLeft === 0) return null;

  const urgency = daysLeft <= 3 ? 'red' : daysLeft <= 7 ? 'amber' : 'indigo';

  const colors = {
    red:   { bg: 'bg-red-600',   badge: 'bg-red-800',   text: 'text-red-100',   btn: 'bg-white text-red-700' },
    amber: { bg: 'bg-amber-600', badge: 'bg-amber-800', text: 'text-amber-100', btn: 'bg-white text-amber-700' },
    indigo:{ bg: 'bg-indigo-600',badge: 'bg-indigo-800',text: 'text-indigo-100',btn: 'bg-white text-indigo-700' },
  }[urgency];

  const dismiss = () => {
    localStorage.setItem('trial-banner-dismissed-v2', 'true');
    setDismissed(true);
  };

  const convText = totalConversations > 0
    ? `Your AI has already handled ${totalConversations.toLocaleString()} conversation${totalConversations !== 1 ? 's' : ''}.`
    : clientCount > 0 ? 'Your AI client is ready to start handling leads.' : '';

  return (
    <div className={`${colors.bg} text-white rounded-2xl p-4 mb-6 flex items-center gap-4 relative`}>
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-white/60 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className={`${colors.badge} rounded-xl px-3 py-2 text-center shrink-0 min-w-[64px]`}>
        <p className="text-2xl font-black leading-none">{daysLeft}</p>
        <p className="text-[10px] font-semibold opacity-80 mt-0.5">DAYS LEFT</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Clock className="h-3.5 w-3.5 opacity-80" />
          <p className="text-sm font-bold">
            {daysLeft <= 3 ? 'Trial ending soon — don\'t lose your setup!' : `${daysLeft} days left on your free trial`}
          </p>
        </div>
        <p className={`text-xs ${colors.text} leading-relaxed`}>
          {convText} Upgrade now to keep your AI running after the trial ends.
        </p>
      </div>

      <Link
        href="/agency/billing?upgrade=starter"
        className={`${colors.btn} font-bold text-sm px-4 py-2 rounded-xl whitespace-nowrap hover:opacity-90 transition shrink-0`}
      >
        Upgrade — $99/mo →
      </Link>
    </div>
  );
}
