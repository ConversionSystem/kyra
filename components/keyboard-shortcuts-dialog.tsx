'use client';

import { useState, useEffect } from 'react';
import { X, Keyboard, Command } from 'lucide-react';

// ─── Shortcut definitions ───────────────────────────────────────────────────

interface Shortcut {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['?'], label: 'Show keyboard shortcuts' },
      { keys: ['Esc'], label: 'Close dialog / modal' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['G', 'H'], label: 'Go to Mission Control (home)' },
      { keys: ['G', 'C'], label: 'Go to Clients' },
      { keys: ['G', 'I'], label: 'Go to Inbox' },
      { keys: ['G', 'A'], label: 'Go to Analytics' },
      { keys: ['G', 'S'], label: 'Go to Settings' },
      { keys: ['G', 'B'], label: 'Go to Billing' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['N'], label: 'New AI Worker' },
    ],
  },
];

// ─── Key combo renderer ─────────────────────────────────────────────────────

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((key, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span className="text-gray-300 text-[10px] mx-0.5">then</span>}
          <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md shadow-sm">
            {key === '⌘' ? <Command className="h-3 w-3" /> : key}
          </kbd>
        </span>
      ))}
    </span>
  );
}

// ─── Imperative open via ref ────────────────────────────────────────────────

let _openShortcuts: (() => void) | null = null;

export function openKeyboardShortcuts() {
  _openShortcuts?.();
}

// ─── Dialog component ───────────────────────────────────────────────────────

export function KeyboardShortcutsDialogWithRef() {
  const [open, setOpen] = useState(false);

  // Register imperative open
  useEffect(() => {
    _openShortcuts = () => setOpen(true);
    return () => { _openShortcuts = null; };
  }, []);

  // Listen for "?" key to toggle, Esc to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(prev => !prev);
      }

      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-indigo-600 p-2">
                <Keyboard className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Keyboard Shortcuts</h2>
                <p className="text-xs text-gray-400">Navigate faster with your keyboard</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto py-2 divide-y divide-gray-50">
            {SHORTCUT_GROUPS.map(group => (
              <div key={group.title} className="px-5 py-3">
                <h3 className="text-[10px] uppercase tracking-wider font-medium text-gray-400 mb-2.5">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm text-gray-700">{shortcut.label}</span>
                      <KeyCombo keys={shortcut.keys} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[10px] text-gray-400 text-center">
              Press <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px] font-medium">?</kbd> to toggle this dialog
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
