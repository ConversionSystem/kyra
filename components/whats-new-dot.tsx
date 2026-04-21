'use client';

import { useState, useEffect } from 'react';
import { CHANGELOG_VERSION } from '@/lib/changelog-version';

const STORAGE_KEY = 'kyra:changelog-seen';

/**
 * Pulsing green dot that appears when the user hasn't seen the latest changelog.
 * Disappears once they visit /changelog (which calls markChangelogSeen).
 */
export function WhatsNewDot() {
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== CHANGELOG_VERSION) {
        setHasUnseen(true);
      }
    } catch {
      // Storage blocked — don't show dot
    }
  }, []);

  if (!hasUnseen) return null;

  return (
    <span className="relative flex h-2 w-2 ml-auto shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

/**
 * Call this when the user visits /changelog to mark the current version as seen.
 */
export function ChangelogSeenMarker() {
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, CHANGELOG_VERSION);
    } catch {
      // Ignore
    }
  }, []);

  return null;
}
