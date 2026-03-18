'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  MessageSquare,
  Zap,
  BarChart3,
  Radio,
  KeyRound,

  Contact as ContactIcon,
  Target as TargetIcon,
  BarChart3 as CrmChartIcon,
  Brain as BrainIcon,
  Settings,
  Terminal,
  ExternalLink,
  Menu,
  X,
  TrendingUp,
  CreditCard,
  Sparkles,
  Loader2,
  Crown,
  Coins,
  Phone,
  MessageCircle,
  Bot,
  Zap as ZapIcon,
  CheckSquare,
  Activity,
  GitBranch,
  LogOut,
  ChevronDown,
  ChevronRight,
  Star,
  Gift,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgencySettings } from '@/lib/agency/types';
import type { LucideIcon } from 'lucide-react';
import { CreditBadge } from '@/components/chat/CreditBadge';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  masterOnly?: boolean;
  badge?: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

// ─── Agency Nav (minimal sidebar — sub-pages live inside their sections) ────
const navSections: NavSection[] = [
  {
    items: [
      { label: 'Mission Control', href: '/agency', icon: Activity },
      { label: 'Clients', href: '/agency/clients', icon: Users },
      { label: 'Websites', href: '/agency/sites', icon: Globe },
    ],
  },
  // CRM now lives inside each client's dashboard (CRM tab)
  {
    label: 'Account',
    collapsible: true,
    items: [
      { label: 'Billing', href: '/agency/billing', icon: CreditCard },
      { label: 'Credits', href: '/agency/credits', icon: Coins },
      { label: 'Referrals', href: '/agency/referrals', icon: Gift },
      { label: 'API Keys', href: '/agency/api-keys', icon: KeyRound },
      { label: 'Settings', href: '/agency/settings', icon: Settings },
    ],
  },
];

const planColors: Record<string, string> = {
  free:     'border-gray-200 bg-gray-50 text-gray-500',
  solo_pro: 'border-violet-200 bg-violet-50 text-violet-600',
  starter:  'border-blue-200 bg-blue-50 text-blue-600',
  pro:      'border-indigo-200 bg-indigo-50 text-indigo-600',
  scale:    'border-amber-200 bg-amber-50 text-amber-600',
};

// ─── Collapsible Section ───────────────────────────────────────────────────
function CollapsibleSection({
  label,
  collapsible,
  defaultOpen,
  hasBranding,
  storageKey,
  children,
}: {
  label?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  hasBranding: boolean;
  storageKey?: string;
  children: React.ReactNode;
}) {
  const initialOpen = defaultOpen ?? !collapsible;
  const [open, setOpen] = useState(initialOpen);

  // Restore persisted state for collapsible sections
  useEffect(() => {
    if (!collapsible || !storageKey) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'open') {
        setOpen(true);
      } else if (stored === 'closed') {
        setOpen(false);
      }
    } catch {
      // Ignore storage failures (private mode / blocked storage)
    }
  }, [collapsible, storageKey]);

  // Persist toggled state across sessions
  useEffect(() => {
    if (!collapsible || !storageKey) return;

    try {
      localStorage.setItem(storageKey, open ? 'open' : 'closed');
    } catch {
      // Ignore storage failures (private mode / blocked storage)
    }
  }, [open, collapsible, storageKey]);

  // Auto-open when defaultOpen changes (e.g. navigating into a section)
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  if (!label) return <div>{children}</div>;

  if (!collapsible) {
    return (
      <div>
        <div className={cn(
          'text-[10px] uppercase tracking-widest font-medium px-2.5 pt-4 pb-1 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap',
          hasBranding ? 'text-white/40' : 'text-gray-500'
        )}>
          {label}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-between w-full text-[10px] uppercase tracking-widest font-medium px-2.5 pt-4 pb-1 transition-colors opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap',
          hasBranding ? 'text-white/40 hover:text-white/60' : 'text-gray-500 hover:text-gray-300'
        )}
      >
        {label}
        {open
          ? <ChevronDown className="h-3 w-3" />
          : <ChevronRight className="h-3 w-3" />
        }
      </button>
      {open && children}
    </div>
  );
}

interface AgencySidebarProps {
  agencyName: string;
  plan: string;
  settings?: AgencySettings;
  isMaster?: boolean;
}

export function AgencySidebar({ agencyName, plan, settings, isMaster }: AgencySidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agencyGatewayUrl, setAgencyGatewayUrl] = useState<string | null>(null);
  const [agencyGatewayToken, setAgencyGatewayToken] = useState<string | null>(null);
  const [provisioningGateway, setProvisioningGateway] = useState(false);
  const [escalationCount, setEscalationCount] = useState(0);

  // Poll for unread escalations every 2 minutes
  useEffect(() => {
    const fetchEscalations = () => {
      fetch('/api/agency/analytics/overview')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setEscalationCount(d.escalations_week ?? 0); })
        .catch(() => {});
    };
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 120_000);
    return () => clearInterval(interval);
  }, []);

  // Solo gateway provisioning removed — solo accounts now use client-level containers
  // (auto-provisioned during signup in /api/auth/solo-signup)

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const logoUrl = settings?.logo_url;
  const companyName = settings?.company_name || agencyName;
  const hasBranding = !!(logoUrl || settings?.primary_color || settings?.company_name);
  const sidebarContent = (
    <>
      {/* Header */}
      <div
        className={cn(
          'px-3 py-3 border-b',
          hasBranding ? 'border-white/10' : 'border-gray-800'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {logoUrl ? (
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={`${companyName} logo`}
                  className="h-full w-full object-contain p-0.5"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
            <h2 className={cn('text-base font-semibold truncate opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 w-0 group-hover/sidebar:w-auto', 'text-white')}>
              {companyName}
            </h2>
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 h-0 group-hover/sidebar:h-auto overflow-hidden">
          <Badge className={cn('capitalize text-[10px] px-1.5 py-0', planColors[plan] ?? planColors.starter)}>
            {plan}
          </Badge>
          <CreditBadge />
        </div>
      </div>

      {/* Upgrade banner removed — clutters collapsed sidebar */}

      {/* My AI Worker button removed — access AI via client terminal */}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0 overflow-y-auto scrollbar-hide">
        {navSections.map((section, si) => {
          const sectionHrefPrefixes = section.items.map(i => i.href);
          const isSectionActive = section.collapsible && sectionHrefPrefixes.some(
            href => href === '/agency' ? pathname === '/agency' : pathname.startsWith(href)
          );

          return (
            <CollapsibleSection
              key={si}
              label={section.label}
              collapsible={section.collapsible}
              defaultOpen={section.defaultOpen ?? isSectionActive}
              hasBranding={hasBranding}
              storageKey={section.label ? `agency-sidebar:section:${section.label.toLowerCase().replace(/\s+/g, '-')}` : undefined}
            >
              {section.items.filter(item => !item.masterOnly || isMaster).map((item) => {
                const isActive =
                  item.href === '/agency'
                    ? pathname === '/agency'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                      isActive
                        ? hasBranding
                          ? 'bg-white/20 text-white font-medium'
                          : 'bg-gray-800 text-white'
                        : hasBranding
                          ? 'text-white/70 hover:bg-white/10 hover:text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 truncate">{item.label}</span>
                    {item.href === '/agency' && escalationCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                        {escalationCount > 9 ? '9+' : escalationCount}
                      </span>
                    )}
                    {item.href === '/agency/ai-model' && !isActive && (
                      <span className="ml-auto bg-indigo-500 text-white text-[9px] font-bold rounded px-1.5 py-0.5 leading-none uppercase tracking-wide">
                        New
                      </span>
                    )}
                    {item.badge && item.href !== '/agency/ai-model' && !isActive && (
                      <span className="ml-auto bg-emerald-500 text-white text-[9px] font-bold rounded px-1.5 py-0.5 leading-none uppercase tracking-wide">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </CollapsibleSection>
          );
        })}
        {/* Master Control link — only for ConversionSystem */}
        {isMaster && (
          <div className="pt-2">
            <div className={cn('text-[9px] uppercase tracking-widest font-medium px-2.5 pb-1 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200', hasBranding ? 'text-white/40' : 'text-gray-500')}>
              Platform
            </div>
            <Link
              href="/master"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                pathname.startsWith('/master')
                  ? 'bg-yellow-500/20 text-yellow-300 font-medium'
                  : hasBranding
                    ? 'text-white/70 hover:bg-white/10 hover:text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Crown className="h-4 w-4 shrink-0 text-yellow-400" />
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 truncate">Master Control</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Log Out */}
      <div className="px-2 pb-2 mt-auto border-t border-gray-800/0 group-hover/sidebar:border-gray-800 transition-colors duration-200 pt-2">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-2.5 py-2 text-sm text-gray-500 hover:text-red-400 hover:bg-gray-800/50 rounded-lg transition"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Log Out</span>
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold text-white truncate">{companyName}</h1>
        <Badge className={cn('ml-auto capitalize text-[10px]', planColors[plan] ?? planColors.starter)}>
          {plan}
        </Badge>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in) */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 bottom-0 z-50 w-60 flex flex-col transition-transform duration-200 ease-in-out bg-gray-900',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar — collapsed (icons only), expands on hover */}
      <aside
        className="hidden lg:flex border-r border-gray-800 bg-gray-900 flex-col shrink-0 w-14 hover:w-52 transition-all duration-200 ease-in-out group/sidebar overflow-hidden scrollbar-hide"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
