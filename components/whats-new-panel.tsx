'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Zap, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { CHANGELOG_VERSION } from '@/lib/changelog-version';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'kyra:changelog-seen';

interface Update {
  emoji: string;
  text: string;
}

interface ChangelogEntry {
  date: string;
  tag: string;
  tagColor: string;
  title: string;
  items: Update[];
}

// Latest 2 entries — keep this in sync with the changelog page
// (or extract to a shared file when it grows)
const RECENT_UPDATES: ChangelogEntry[] = [
  {
    date: 'April 20, 2026',
    tag: 'Security Sprint',
    tagColor: 'bg-red-100 text-red-700',
    title: 'Phase 0 Security Hardening — 18 Commits',
    items: [
      { emoji: '🔒', text: 'All webhooks now verify signatures (fail-closed)' },
      { emoji: '🛡️', text: 'Admin routes gated with requireMaster' },
      { emoji: '🗄️', text: 'Row-Level Security on 16 unprotected tables' },
      { emoji: '💰', text: 'Billing re-enabled — stub routes removed' },
      { emoji: '🧪', text: 'Integration tests for 5 critical routes' },
      { emoji: '🧹', text: 'Secrets scrubbed, dead code removed' },
    ],
  },
  {
    date: 'April 18, 2026',
    tag: 'Billing & Security',
    tagColor: 'bg-green-100 text-green-700',
    title: 'Billing Sprint + Webhook Monitor',
    items: [
      { emoji: '📡', text: 'Stripe Webhook Health Monitor on admin dashboard' },
      { emoji: '💰', text: 'Credits granted on subscription.updated' },
      { emoji: '🔒', text: 'Fail-closed cron auth + GHL skill validation' },
      { emoji: '⚡', text: 'Plan upgrade race condition fixed' },
    ],
  },
];

export function WhatsNewPanel() {
  const [open, setOpen] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== CHANGELOG_VERSION) {
        setHasUnseen(true);
      }
    } catch {}
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setHasUnseen(false);
    try {
      localStorage.setItem(STORAGE_KEY, CHANGELOG_VERSION);
    } catch {}
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      {/* Trigger button — floating bottom-right */}
      {hasUnseen && !open && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-full shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 text-sm font-medium"
        >
          <Zap className="h-4 w-4" />
          What&apos;s New
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100">
              <Zap className="h-4 w-4 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">What&apos;s New</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {RECENT_UPDATES.map((entry, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{entry.date}</span>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', entry.tagColor)}>
                  {entry.tag}
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900">{entry.title}</h3>
              <ul className="space-y-2">
                {entry.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="shrink-0 text-base leading-tight">{item.emoji}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
              {i < RECENT_UPDATES.length - 1 && (
                <div className="border-b border-gray-100" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <Link
            href="/changelog"
            onClick={handleClose}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition"
          >
            View full changelog
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </>
  );
}
