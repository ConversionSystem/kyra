'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BookOpen,
  Zap,
  BarChart3,
  Radio,
  KeyRound,
  Settings,
  Terminal,
  ExternalLink,
  Menu,
  X,
  TrendingUp,
  CreditCard,
  FileText,
  Target,
  Heart,
  Wallet,
  Store,
  Mail,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgencySettings } from '@/lib/agency/types';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { label: 'Overview', href: '/agency', icon: LayoutDashboard },
      { label: 'Clients', href: '/agency/clients', icon: Users },
      { label: 'Conversations', href: '/agency/conversations', icon: MessageSquare },
    ],
  },
  {
    label: 'Automation',
    items: [
      { label: 'Heartbeat', href: '/agency/heartbeat', icon: Heart },
      { label: 'Automations', href: '/agency/automations', icon: Zap },
      { label: 'Channels', href: '/agency/channels', icon: Radio },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Performance', href: '/agency/performance', icon: BarChart3 },
      { label: 'Budget', href: '/agency/budget', icon: Wallet },
      { label: 'Revenue', href: '/agency/revenue', icon: TrendingUp },
      { label: 'Plans', href: '/agency/plans', icon: CreditCard },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Templates', href: '/agency/templates', icon: BookOpen },
      { label: 'Proposal', href: '/agency/proposal', icon: FileText },
      { label: 'Sales Kit', href: '/agency/sales-kit', icon: Target },
      { label: 'GHL Listing', href: '/agency/ghl-listing', icon: Store },
      { label: 'Outreach', href: '/agency/outreach', icon: Mail },
      { label: 'Launch Pitch', href: '/agency/launch-pitch', icon: Rocket },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'API Keys', href: '/agency/api-keys', icon: KeyRound },
      { label: 'Settings', href: '/agency/settings', icon: Settings },
    ],
  },
];

const planColors: Record<string, string> = {
  starter: 'border-blue-200 bg-blue-50 text-blue-600',
  pro: 'border-indigo-200 bg-indigo-50 text-indigo-600',
  scale: 'border-amber-200 bg-amber-50 text-amber-600',
  beta: 'border-amber-200 bg-amber-50 text-amber-700',
};

interface AgencySidebarProps {
  agencyName: string;
  plan: string;
  settings?: AgencySettings;
}

export function AgencySidebar({ agencyName, plan, settings }: AgencySidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/openclaw/dashboard-url')
      .then((r) => r.json())
      .then((data) => { if (data.url) setDashboardUrl(data.url); })
      .catch(() => {});
  }, []);

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
  const primaryColor = settings?.primary_color;
  const companyName = settings?.company_name || agencyName;
  const isPremium = true; // All features unlocked during beta
  const hasBranding = isPremium && primaryColor;

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
            {isPremium && logoUrl ? (
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

        <Badge className={cn('mt-2 capitalize', planColors[plan] ?? planColors.starter)}>
          {plan}
        </Badge>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <div className={cn(
                'text-[10px] uppercase tracking-widest font-medium px-3 pt-4 pb-1',
                hasBranding ? 'text-white/40' : 'text-gray-500'
              )}>
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
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
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* OpenClaw Terminal — opens in new tab */}
      <div className={cn('p-3 border-t', hasBranding ? 'border-white/10' : 'border-gray-800')}>
        <a
          href={dashboardUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { if (!dashboardUrl) e.preventDefault(); setMobileOpen(false); }}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
            dashboardUrl
              ? hasBranding
                ? 'text-white/70 hover:bg-white/10 hover:text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              : hasBranding
                ? 'text-white/20 cursor-not-allowed'
                : 'text-gray-600 cursor-not-allowed'
          )}
        >
          <Terminal className="h-4 w-4 shrink-0" />
          OpenClaw Terminal
          {dashboardUrl && <ExternalLink className="h-3 w-3 ml-auto opacity-50" />}
        </a>
        <div className={cn('px-3 mt-1 text-xs', hasBranding ? 'text-white/20' : 'text-gray-700')}>
          Powered by OpenClaw
        </div>
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
          'lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          hasBranding ? '' : 'bg-gray-900'
        )}
        style={hasBranding ? { backgroundColor: primaryColor } : undefined}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside
        className={cn(
          'hidden lg:flex w-64 border-r flex-col shrink-0',
          hasBranding ? 'border-white/10' : 'border-gray-800 bg-gray-900'
        )}
        style={hasBranding ? { backgroundColor: primaryColor } : undefined}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
