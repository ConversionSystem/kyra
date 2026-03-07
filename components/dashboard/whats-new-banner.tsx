'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Sparkles, ArrowRight } from 'lucide-react';

// Bump this version string whenever new features are added.
// Users who dismissed an older version will see the banner again.
const BANNER_VERSION = '2026-03-07-v1';
const STORAGE_KEY = `kyra_whats_new_dismissed_${BANNER_VERSION}`;

const LATEST_FEATURES = [
  { emoji: '🎁', text: 'Referral Program — earn 100 credits for every friend you invite; friends get 100 credits too' },
  { emoji: '📞', text: 'Voice AI — inbound & outbound calls now available. Answer leads by phone, book appointments, escalate to humans' },
  { emoji: '⚡', text: 'Automation Triggers — automate your AI worker on real-world events (GHL webhook, new contact, deal stage change)' },
  { emoji: '🧠', text: 'Customer Intelligence — AI-powered contact insights, relationship memory, and engagement scoring' },
  { emoji: '💬', text: 'Conversations Inbox — all channels (SMS, Telegram, web chat, voice) unified in one real-time feed' },
  { emoji: '🪟', text: 'Chat Widget — embed Kyra on any website; tracks source URL and session for full analytics' },
  { emoji: '🎯', text: 'Mission Control fleet view — see every AI worker\'s status, today\'s activity, and errors at a glance' },
  { emoji: '🛡️', text: 'Review Gates — approve AI responses before they send. Human-in-the-loop control' },
  { emoji: '📈', text: 'Performance CSV export + per-client cost tracking with margin visibility' },
];

export default function WhatsNewBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      // localStorage blocked (e.g. private browsing) — just hide
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-indigo-100">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-indigo-600 p-2">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">What&apos;s New 🎉</h3>
            <p className="text-xs text-indigo-500 font-medium">Latest updates just landed</p>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Feature grid */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {LATEST_FEATURES.map((feat, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
            <span className="text-base leading-none shrink-0">{feat.emoji}</span>
            <span>{feat.text}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-white border-t border-indigo-100 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-400">
          Fresh updates to help your agency grow.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/changelog"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
          >
            Full changelog <ArrowRight className="h-3 w-3" />
          </Link>
          <button
            onClick={dismiss}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
