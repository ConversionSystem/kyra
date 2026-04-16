'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global keyboard navigation shortcuts.
 *
 * G → H  = Mission Control (home)
 * G → C  = Clients
 * G → I  = Inbox
 * G → A  = Analytics
 * G → S  = Settings
 * G → B  = Billing
 * N      = New AI Worker
 *
 * All shortcuts are suppressed inside inputs/textareas/contenteditable.
 */
export function useKeyboardNavigation() {
  const router = useRouter();
  const pendingG = useRef(false);
  const gTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function isEditable(e: KeyboardEvent): boolean {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if ((e.target as HTMLElement)?.isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isEditable(e)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // ─── "G then X" combos ─────────────────────────────
      if (pendingG.current) {
        pendingG.current = false;
        if (gTimeout.current) clearTimeout(gTimeout.current);

        const routes: Record<string, string> = {
          h: '/agency',
          c: '/agency/clients',
          i: '/agency/clients?tab=inbox',
          a: '/agency/analytics',
          s: '/agency/settings',
          b: '/agency/billing',
        };

        if (routes[key]) {
          e.preventDefault();
          router.push(routes[key]);
        }
        return;
      }

      // ─── Start "G" sequence ────────────────────────────
      if (key === 'g' && !e.shiftKey) {
        pendingG.current = true;
        // Reset after 1 second if no follow-up
        gTimeout.current = setTimeout(() => {
          pendingG.current = false;
        }, 1000);
        return;
      }

      // ─── Single-key shortcuts ──────────────────────────
      if (key === 'n' && !e.shiftKey) {
        e.preventDefault();
        router.push('/agency/clients/new');
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gTimeout.current) clearTimeout(gTimeout.current);
    };
  }, [router]);
}
