'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Settings,
  ChevronLeft,
  Mic,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgencySettings } from '@/lib/agency/types';

const navItems = [
  { label: 'Overview', href: '/agency', icon: LayoutDashboard },
  { label: 'Clients', href: '/agency/clients', icon: Users },
  { label: 'Templates', href: '/agency/templates', icon: FileText },
  { label: 'Skill Builder', href: '/agency/skill-builder', icon: Sparkles },
  { label: 'Voice Commands', href: '/agency/voice-commands', icon: Mic },
  { label: 'Billing', href: '/agency/billing', icon: CreditCard },
  { label: 'Settings', href: '/agency/settings', icon: Settings },
];

const planColors: Record<string, string> = {
  starter: 'border-blue-200 bg-blue-50 text-blue-600',
  pro: 'border-indigo-200 bg-indigo-50 text-indigo-600',
  scale: 'border-amber-200 bg-amber-50 text-amber-600',
};

interface AgencySidebarProps {
  agencyName: string;
  plan: string;
  settings?: AgencySettings;
}

export function AgencySidebar({ agencyName, plan, settings }: AgencySidebarProps) {
  const pathname = usePathname();

  // Branding overrides — fall back to defaults when not set
  const logoUrl = settings?.logo_url;
  const primaryColor = settings?.primary_color;
  const companyName = settings?.company_name || agencyName;
  const isPremium = plan === 'pro' || plan === 'scale';
  const hasBranding = isPremium && primaryColor;

  return (
    <aside
      className={cn(
        'w-64 border-r flex flex-col shrink-0',
        hasBranding ? 'border-white/10' : 'border-gray-800 bg-gray-900'
      )}
      style={hasBranding ? { backgroundColor: primaryColor } : undefined}
    >
      {/* Header */}
      <div
        className={cn(
          'p-4 border-b',
          hasBranding ? 'border-white/10' : 'border-gray-800'
        )}
      >
        <Link
          href="/chat"
          className={cn(
            'flex items-center gap-2 text-xs transition-colors mb-3',
            hasBranding
              ? 'text-white/60 hover:text-white/80'
              : 'text-gray-400 hover:text-gray-300'
          )}
        >
          <ChevronLeft className="h-3 w-3" />
          Back to Chat
        </Link>

        <div className="flex items-center gap-3">
          {/* Agency logo */}
          {isPremium && logoUrl ? (
            <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={`${companyName} logo`}
                className="h-full w-full object-contain p-0.5"
                onError={(e) => {
                  // Hide broken image and let the name show alone
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : null}

          <h2
            className={cn(
              'text-lg font-semibold truncate',
              hasBranding ? 'text-white' : 'text-white'
            )}
          >
            {companyName}
          </h2>
        </div>

        <Badge className={cn('mt-2 capitalize', planColors[plan] ?? planColors.starter)}>
          {plan}
        </Badge>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/agency'
              ? pathname === '/agency'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
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
      </nav>

      {/* 
        TODO: Client-facing chat page 
        When a public/embed chat page exists for agency clients, apply branding
        (logo_url, company_name, primary_color, accent_color) from AgencySettings
        to that page as well. Currently no client-facing chat page exists — only
        the agency dashboard chat at /chat.
      */}
    </aside>
  );
}
