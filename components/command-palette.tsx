'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, Users, MessageSquare, Terminal, Globe, Search, Settings,
  CreditCard, KeyRound, Gift, BarChart2, Brain, Sparkles, Mail,
  Phone, Bot, ClipboardList, ArrowRight, Command, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  action?: () => void;
  section: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  clients?: Array<{ id: string; name: string; gateway_status?: string }>;
}

// ─── Static nav items ───────────────────────────────────────────────────────

const NAV_ITEMS: CommandItem[] = [
  { id: 'mission-control', label: 'Mission Control', description: 'Dashboard overview', icon: Activity, href: '/agency', section: 'Navigation', keywords: ['home', 'dashboard', 'overview'] },
  { id: 'clients', label: 'Clients', description: 'Manage AI workers', icon: Users, href: '/agency/clients', section: 'Navigation', keywords: ['workers', 'accounts'] },
  { id: 'inbox', label: 'Inbox', description: 'All conversations', icon: MessageSquare, href: '/agency/clients?tab=inbox', section: 'Navigation', keywords: ['messages', 'chat', 'conversations'] },
  { id: 'terminal', label: 'Terminal', description: 'AI terminal', icon: Terminal, href: '/agency/clients?tab=terminal', section: 'Navigation', keywords: ['console', 'command'] },
  { id: 'analytics', label: 'Analytics', description: 'Performance metrics', icon: BarChart2, href: '/agency/analytics', section: 'Navigation', keywords: ['stats', 'metrics', 'data'] },
  { id: 'intelligence', label: 'Intelligence', description: 'AI-powered insights', icon: Brain, href: '/agency/intelligence', section: 'Navigation', keywords: ['insights', 'reports'] },
  { id: 'websites', label: 'Websites', description: 'Manage client sites', icon: Globe, href: '/agency/sites', section: 'Navigation', keywords: ['sites', 'web'] },
  { id: 'seo', label: 'SEO/GEO Command Center', description: 'Search engine optimization', icon: Search, href: '/agency/seo', section: 'Navigation', keywords: ['seo', 'geo', 'keywords', 'rankings'] },
  { id: 'build-requests', label: 'Build Requests', description: 'Website build queue', icon: Sparkles, href: '/agency/build-requests', section: 'Navigation', keywords: ['builds', 'queue'] },
  { id: 'billing', label: 'Billing', description: 'Plans & invoices', icon: CreditCard, href: '/agency/billing', section: 'Account', keywords: ['plan', 'subscription', 'payment', 'invoice'] },
  { id: 'api-keys', label: 'API Keys', description: 'OpenAI & integrations', icon: KeyRound, href: '/agency/api-keys', section: 'Account', keywords: ['keys', 'openai', 'api'] },
  { id: 'referrals', label: 'Referrals', description: 'Earn free credits', icon: Gift, href: '/agency/referrals', section: 'Account', keywords: ['refer', 'invite', 'earn'] },
  { id: 'settings', label: 'Settings', description: 'Agency settings', icon: Settings, href: '/agency/settings', section: 'Account', keywords: ['config', 'preferences'] },
  { id: 'add-client', label: 'Add AI Worker', description: 'Create a new client', icon: Bot, href: '/agency/clients/new', section: 'Actions', keywords: ['new', 'create', 'add', 'worker'] },
  { id: 'changelog', label: 'Changelog', description: "What's new", icon: ClipboardList, href: '/changelog', section: 'Actions', keywords: ['updates', 'whats new', 'releases'] },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function CommandPalette({ clients = [] }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build client items dynamically
  const clientItems: CommandItem[] = useMemo(() =>
    clients.map(c => ({
      id: `client-${c.id}`,
      label: c.name,
      description: c.gateway_status === 'running' ? '🟢 Online' : '⚫ Offline',
      icon: Users,
      href: `/agency/clients/${c.id}`,
      section: 'Clients',
      keywords: [c.name.toLowerCase()],
    })),
    [clients]
  );

  // All items combined
  const allItems = useMemo(() => [...NAV_ITEMS, ...clientItems], [clientItems]);

  // Filter
  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase().trim();
    return allItems.filter(item => {
      if (item.label.toLowerCase().includes(q)) return true;
      if (item.description?.toLowerCase().includes(q)) return true;
      if (item.keywords?.some(k => k.includes(q))) return true;
      return false;
    });
  }, [query, allItems]);

  // Group by section
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const existing = map.get(item.section) || [];
      existing.push(item);
      map.set(item.section, existing);
    }
    return map;
  }, [filtered]);

  // Flat list for keyboard nav
  const flatList = useMemo(() => {
    const result: CommandItem[] = [];
    for (const items of grouped.values()) {
      result.push(...items);
    }
    return result;
  }, [grouped]);

  // Reset selection on filter change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
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

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const executeItem = useCallback((item: CommandItem) => {
    setOpen(false);
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  }, [router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatList[selectedIndex]) {
          executeItem(flatList[selectedIndex]);
        }
        break;
    }
  }, [flatList, selectedIndex, executeItem]);

  if (!open) return null;

  let itemIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Search className="h-5 w-5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages, clients, actions..."
              className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
            {flatList.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              Array.from(grouped.entries()).map(([section, items]) => (
                <div key={section}>
                  <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider font-medium text-gray-400">
                    {section}
                  </div>
                  {items.map(item => {
                    const idx = itemIndex++;
                    const isSelected = idx === selectedIndex;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        data-index={idx}
                        onClick={() => executeItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        <Icon className={cn(
                          'h-4 w-4 shrink-0',
                          isSelected ? 'text-indigo-500' : 'text-gray-400'
                        )} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.description && (
                            <span className={cn(
                              'ml-2 text-xs',
                              isSelected ? 'text-indigo-400' : 'text-gray-400'
                            )}>
                              {item.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <ArrowRight className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px]">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px]">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px]">esc</kbd>
                close
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Command className="h-3 w-3" />K to toggle
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Trigger button for sidebar ─────────────────────────────────────────────

export function CommandPaletteTrigger({ hasBranding }: { hasBranding?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      onClick={() => {
        // Dispatch keyboard event to toggle command palette
        window.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          bubbles: true,
        }));
      }}
      className={cn(
        'flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs transition-colors group/cmd',
        hasBranding
          ? 'text-white/50 hover:text-white/80 hover:bg-white/10'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      )}
    >
      <Search className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className={cn(
        'hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded border',
        hasBranding
          ? 'text-white/40 bg-white/10 border-white/20'
          : 'text-gray-400 bg-gray-100 border-gray-200'
      )}>
        ⌘K
      </kbd>
    </button>
  );
}
