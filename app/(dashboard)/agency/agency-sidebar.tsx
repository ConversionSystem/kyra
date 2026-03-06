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
  Inbox,
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
}

interface NavSection {
  label?: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

// ─── Agency Nav (collapsible groups, minimal top-level) ────────────────────
const navSections: NavSection[] = [
  {
    items: [
      { label: 'Mission Control', href: '/agency', icon: Activity },
      { label: 'Clients', href: '/agency/clients', icon: Users },
      { label: 'Conversations', href: '/agency/conversations', icon: MessageSquare },
    ],
  },
  {
    label: 'CRM',
    collapsible: true,
    items: [
      { label: 'Command Feed', href: '/agency/crm', icon: Inbox },
      { label: 'Contacts', href: '/agency/crm/contacts', icon: ContactIcon },
      { label: 'Deals', href: '/agency/crm/deals', icon: TargetIcon },
      { label: 'Tasks', href: '/agency/crm/tasks', icon: CheckSquare },
      { label: 'Analytics', href: '/agency/crm/analytics', icon: CrmChartIcon },
    ],
  },
  {
    label: 'AI Worker',
    collapsible: true,
    items: [
      { label: 'AI Templates', href: '/agency/ai-setup', icon: Sparkles },
      { label: 'Smart Routing', href: '/agency/agents', icon: Bot },
      { label: 'Channels', href: '/agency/channels', icon: Radio },
      { label: 'Voice AI', href: '/agency/voice', icon: Phone },
      { label: 'Chat Widget', href: '/agency/widget', icon: MessageCircle },
    ],
  },
  {
    label: 'Automation',
    collapsible: true,
    items: [
      { label: 'Autopilot', href: '/agency/autopilot', icon: ZapIcon },
      { label: 'Pipelines', href: '/agency/pipelines', icon: GitBranch },
      { label: 'Proactive AI', href: '/agency/automations', icon: Zap },
    ],
  },
  {
    label: 'Insights',
    collapsible: true,
    items: [
      { label: 'Performance', href: '/agency/performance', icon: BarChart3 },
      { label: 'Token Usage', href: '/agency/usage', icon: Activity },
      { label: 'Revenue', href: '/agency/revenue', icon: TrendingUp },
    ],
  },
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
  free:    'border-gray-200 bg-gray-50 text-gray-500',
  starter: 'border-blue-200 bg-blue-50 text-blue-600',
  pro:     'border-indigo-200 bg-indigo-50 text-indigo-600',
  scale:   'border-amber-200 bg-amber-50 text-amber-600',
  beta:    'border-amber-200 bg-amber-50 text-amber-700',
};

// ─── Solo Mode Nav ─────────────────────────────────────────────────────────
const soloNavSections: NavSection[] = [
  {
    items: [
      { label: 'Mission Control', href: '/agency', icon: Activity },
      { label: 'Conversations', href: '/agency/conversations', icon: MessageSquare },
    ],
  },
  {
    label: 'CRM',
    collapsible: true,
    items: [
      { label: 'Contacts', href: '/agency/crm/contacts', icon: ContactIcon },
      { label: 'Deals', href: '/agency/crm/deals', icon: TargetIcon },
      { label: 'Tasks', href: '/agency/crm/tasks', icon: CheckSquare },
    ],
  },
  {
    label: 'AI Worker',
    collapsible: true,
    items: [
      { label: 'AI Templates', href: '/agency/ai-setup', icon: Sparkles },
      { label: 'Channels', href: '/agency/channels', icon: Radio },
      { label: 'Chat Widget', href: '/agency/widget', icon: MessageCircle },
    ],
  },
  {
    label: 'Account',
    collapsible: true,
    items: [
      { label: 'Billing', href: '/agency/billing', icon: CreditCard },
      { label: 'Credits', href: '/agency/credits', icon: Coins },
      { label: 'Referrals', href: '/agency/referrals', icon: Gift },
      { label: 'Settings', href: '/agency/settings', icon: Settings },
    ],
  },
];

// ─── Collapsible Section ───────────────────────────────────────────────────
function CollapsibleSection({
  label,
  collapsible,
  defaultOpen,
  hasBranding,
  children,
}: {
  label?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  hasBranding: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? !collapsible);

  // Auto-open when defaultOpen changes (e.g. navigating into a section)
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  if (!label) return <div>{children}</div>;

  if (!collapsible) {
    return (
      <div>
        <div className={cn(
          'text-[10px] uppercase tracking-widest font-medium px-3 pt-4 pb-1',
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
          'flex items-center justify-between w-full text-[10px] uppercase tracking-widest font-medium px-3 pt-4 pb-1 transition-colors',
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
  const isSolo = (settings as Record<string, unknown> | undefined)?.account_type === 'solo';
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

  useEffect(() => {
    // Only solo users get an agency-level gateway (their personal AI worker).
    // Agency users create AI workers as clients — no agency-level container needed.
    if (!isSolo) return;

    fetch('/api/agency/gateway')
      .then((r) => r.json())
      .then((data) => {
        if (data.gatewayUrl && data.status === 'running') {
          setAgencyGatewayUrl(data.gatewayUrl);
          setAgencyGatewayToken(data.gatewayToken ?? null);
        } else if (!data.gatewayUrl || data.status === 'not_provisioned' || data.status === 'error') {
          setProvisioningGateway(true);
          fetch('/api/agency/gateway', { method: 'POST' })
            .then((r) => r.json())
            .then((result) => {
              if (result.gatewayUrl) {
                setAgencyGatewayUrl(result.gatewayUrl);
                setAgencyGatewayToken(result.gatewayToken ?? null);
              }
            })
            .catch(() => {})
            .finally(() => setProvisioningGateway(false));
        }
      })
      .catch(() => {});
  }, [isSolo]);

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
  // Sidebar is always dark — branding only applies to logo/name, not background
  const hasBranding = false;

  const sidebarContent = (
    <>
      {/* Header */}
      <div
        className={cn(
          'p-4 border-b',
          hasBranding ? 'border-white/10' : 'border-gray-800'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
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
            <h2 className={cn('text-lg font-semibold truncate', 'text-white')}>
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

        <div className="flex items-center gap-2 mt-2">
          <Badge className={cn('capitalize', planColors[plan] ?? planColors.starter)}>
            {plan}
          </Badge>
          <CreditBadge />
        </div>
      </div>

      {/* Upgrade to agency banner — solo free users only */}
      {isSolo && plan === 'free' && (
        <div className="px-3 pt-3">
          <a
            href="/agency/billing"
            className="block w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-2.5 transition"
          >
            <p className="text-xs font-bold text-indigo-300 mb-0.5">Ready for more?</p>
            <p className="text-[10px] text-indigo-400/80 leading-snug">Upgrade to manage multiple clients & unlock agency features</p>
          </a>
        </div>
      )}

      {/* My AI Worker button removed — access AI via client terminal */}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {(isSolo ? soloNavSections : navSections).map((section, si) => {
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
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
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
                    {item.label}
                    {item.href === '/agency/conversations' && escalationCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                        {escalationCount > 9 ? '9+' : escalationCount}
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
          <div className="pt-3">
            <div className={cn('text-[10px] uppercase tracking-widest font-medium px-3 pb-1', hasBranding ? 'text-white/40' : 'text-gray-500')}>
              Platform
            </div>
            <Link
              href="/master"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                pathname.startsWith('/master')
                  ? 'bg-yellow-500/20 text-yellow-300 font-medium'
                  : hasBranding
                    ? 'text-white/70 hover:bg-white/10 hover:text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Crown className="h-4 w-4 shrink-0 text-yellow-400" />
              Master Control
            </Link>
          </div>
        )}
      </nav>

      {/* Terminal block removed from bottom — now at top for all accounts */}

      {/* Log Out */}
      <div className="px-3 pb-3 mt-auto border-t border-gray-800 pt-3">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-400 hover:bg-gray-800/50 rounded-lg transition"
          >
            <LogOut className="h-4 w-4" />
            Log Out
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
          'lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col transition-transform duration-200 ease-in-out bg-gray-900',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside
        className="hidden lg:flex w-64 border-r border-gray-800 bg-gray-900 flex-col shrink-0"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
