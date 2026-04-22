'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Users, Settings, CreditCard, BarChart3,
  Zap, Brain, KeyRound, HelpCircle, Activity,
  ArrowRight, Command, CornerDownLeft, ChevronUp,
  ChevronDown, Globe, Phone, MessageCircle, Bot,
  Coins, TrendingUp, Sparkles, Radio, Layout,
  FileText, Shield, Palette, GitBranch, X,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  category: 'navigation' | 'clients' | 'actions';
  keywords?: string[];
}

interface ClientResult {
  id: string;
  name: string;
  industry?: string;
  gateway_status?: string;
}

// ── Static Commands ───────────────────────────────────────────────────────

const STATIC_COMMANDS: CommandItem[] = [
  // Navigation
  { id: 'nav-dashboard',   label: 'Dashboard',        icon: Activity,     href: '/agency',             category: 'navigation', keywords: ['home', 'overview', 'mission control'] },
  { id: 'nav-clients',     label: 'AI Workers',       icon: Users,        href: '/agency/clients',     category: 'navigation', keywords: ['clients', 'workers', 'bots', 'containers'] },
  { id: 'nav-analytics',   label: 'Analytics',        icon: BarChart3,    href: '/agency/analytics',   category: 'navigation', keywords: ['stats', 'metrics', 'data', 'reports'] },
  { id: 'nav-performance', label: 'Performance',      icon: TrendingUp,   href: '/agency/performance', category: 'navigation', keywords: ['speed', 'metrics'] },
  { id: 'nav-credits',     label: 'Credits',          icon: Coins,        href: '/agency/credits',     category: 'navigation', keywords: ['billing', 'balance', 'top up', 'buy'] },
  { id: 'nav-billing',     label: 'Billing & Plans',  icon: CreditCard,   href: '/agency/billing',     category: 'navigation', keywords: ['plan', 'subscription', 'upgrade', 'pricing'] },
  { id: 'nav-api-keys',    label: 'API Keys',         icon: KeyRound,     href: '/agency/api-keys',    category: 'navigation', keywords: ['openai', 'anthropic', 'keys', 'models'] },
  { id: 'nav-settings',    label: 'Settings',         icon: Settings,     href: '/agency/settings',    category: 'navigation', keywords: ['config', 'preferences', 'branding', 'white label'] },
  { id: 'nav-channels',    label: 'Channels',         icon: Radio,        href: '/agency/channels',    category: 'navigation', keywords: ['sms', 'whatsapp', 'telegram', 'ghl', 'integrations'] },
  { id: 'nav-voice',       label: 'Voice',            icon: Phone,        href: '/agency/voice',       category: 'navigation', keywords: ['call', 'phone', 'vapi', 'ivr'] },
  { id: 'nav-crm',         label: 'CRM',              icon: MessageCircle,href: '/agency/crm',         category: 'navigation', keywords: ['contacts', 'leads', 'pipeline'] },
  { id: 'nav-agents',      label: 'Agent Builder',    icon: Brain,        href: '/agency/agents',      category: 'navigation', keywords: ['prompts', 'personality', 'instructions'] },
  { id: 'nav-seo',         label: 'SEO',              icon: Globe,        href: '/agency/seo',         category: 'navigation', keywords: ['search', 'google', 'ranking', 'content'] },
  { id: 'nav-sites',       label: 'Sites',            icon: Layout,       href: '/agency/sites',       category: 'navigation', keywords: ['website', 'landing page', 'builder'] },
  { id: 'nav-widget',      label: 'Chat Widget',      icon: MessageCircle,href: '/agency/widget',      category: 'navigation', keywords: ['webchat', 'embed', 'website chat'] },
  { id: 'nav-templates',   label: 'Templates',        icon: FileText,     href: '/agency/templates',   category: 'navigation', keywords: ['industry', 'preset', 'starter'] },
  { id: 'nav-referrals',   label: 'Referrals',        icon: Sparkles,     href: '/agency/referrals',   category: 'navigation', keywords: ['invite', 'earn', 'share', 'free credits'] },
  { id: 'nav-usage',       label: 'Usage',            icon: BarChart3,    href: '/agency/usage',       category: 'navigation', keywords: ['consumption', 'tokens', 'cost'] },
  { id: 'nav-help',        label: 'Help',             icon: HelpCircle,   href: '/agency/help',        category: 'navigation', keywords: ['support', 'docs', 'faq'] },

  // Actions
  { id: 'act-add-client',  label: 'Add AI Worker',    icon: Zap,          href: '/agency/clients/new', category: 'actions',    keywords: ['new', 'create', 'deploy', 'add client'] },
  { id: 'act-changelog',   label: "What's New",       icon: GitBranch,    href: '/changelog',          category: 'actions',    keywords: ['updates', 'changelog', 'release notes'] },
];

const CATEGORY_LABELS: Record<string, string> = {
  clients: 'AI Workers',
  navigation: 'Go to',
  actions: 'Actions',
};

// ── Component ─────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ── Keyboard shortcut: Cmd+K / Ctrl+K ─────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Focus input when opened ───────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Lazy-load clients on first open
      if (!clientsLoaded) {
        fetch('/api/agency/search')
          .then((r) => r.ok ? r.json() : { clients: [] })
          .then((d) => {
            setClients(d.clients || []);
            setClientsLoaded(true);
          })
          .catch(() => setClientsLoaded(true));
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, clientsLoaded]);

  // ── Build filtered results ────────────────────────────────────────────
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const items: CommandItem[] = [];

    // Add client results
    const matchingClients = q
      ? clients.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.industry?.toLowerCase().includes(q),
        )
      : clients.slice(0, 5); // Show top 5 when no query

    matchingClients.forEach((c) => {
      items.push({
        id: `client-${c.id}`,
        label: c.name,
        description: c.industry || undefined,
        icon: Bot,
        href: `/agency/clients/${c.id}`,
        category: 'clients',
        keywords: [],
      });
    });

    // Add static commands
    const matchingStatic = q
      ? STATIC_COMMANDS.filter(
          (cmd) =>
            cmd.label.toLowerCase().includes(q) ||
            cmd.description?.toLowerCase().includes(q) ||
            cmd.keywords?.some((kw) => kw.includes(q)),
        )
      : STATIC_COMMANDS;

    items.push(...matchingStatic);

    return items;
  }, [query, clients]);

  // ── Reset selection on results change ─────────────────────────────────
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query]);

  // ── Execute selected item ─────────────────────────────────────────────
  const execute = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      if (item.href) {
        router.push(item.href);
      } else if (item.action) {
        item.action();
      }
    },
    [router],
  );

  // ── Keyboard navigation ──────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        execute(results[selectedIndex]);
      }
    },
    [results, selectedIndex, execute],
  );

  // ── Scroll selected item into view ────────────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  // Group results by category
  const grouped: Record<string, CommandItem[]> = {};
  results.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  // Order: clients first, then navigation, then actions
  const categoryOrder = ['clients', 'navigation', 'actions'];
  let globalIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Search className="h-5 w-5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, clients, actions…"
              className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-mono rounded border border-gray-200">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500">No results found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              categoryOrder.map((cat) => {
                const items = grouped[cat];
                if (!items || items.length === 0) return null;
                return (
                  <div key={cat} className="mb-1">
                    <div className="px-4 py-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                    </div>
                    {items.map((item) => {
                      const idx = globalIndex++;
                      const Icon = item.icon;
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          data-index={idx}
                          onClick={() => execute(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                              isSelected
                                ? 'bg-indigo-100 text-indigo-600'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.label}</p>
                            {item.description && (
                              <p className="text-xs text-gray-500 truncate">{item.description}</p>
                            )}
                          </div>
                          {isSelected && (
                            <CornerDownLeft className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50/80">
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <ChevronUp className="h-3 w-3" />
                <ChevronDown className="h-3 w-3" />
                navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
                select
              </span>
              <span className="flex items-center gap-1">
                <span className="font-mono">esc</span>
                close
              </span>
            </div>
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Command className="h-3 w-3" />K
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Trigger Button (for sidebar) ──────────────────────────────────────────

export function CommandPaletteTrigger() {
  const [, setForceOpen] = useState(false);

  const handleClick = () => {
    // Dispatch Cmd+K event to open the palette
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      }),
    );
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors group"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 group-hover:bg-gray-200 text-gray-400 text-[10px] font-mono rounded border border-gray-200">
        <Command className="h-2.5 w-2.5" />K
      </kbd>
    </button>
  );
}
