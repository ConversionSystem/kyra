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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Overview', href: '/agency', icon: LayoutDashboard },
  { label: 'Clients', href: '/agency/clients', icon: Users },
  { label: 'Templates', href: '/agency/templates', icon: FileText },
  { label: 'Billing', href: '/agency/billing', icon: CreditCard },
  { label: 'Settings', href: '/agency/settings', icon: Settings },
];

const planColors: Record<string, string> = {
  starter: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  pro: 'border-violet-500/50 bg-violet-500/10 text-violet-400',
  scale: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
};

interface AgencySidebarProps {
  agencyName: string;
  plan: string;
}

export function AgencySidebar({ agencyName, plan }: AgencySidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <Link
          href="/chat"
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-3"
        >
          <ChevronLeft className="h-3 w-3" />
          Back to Chat
        </Link>
        <h2 className="text-lg font-semibold text-zinc-100 truncate">
          {agencyName}
        </h2>
        <Badge className={cn('mt-1 capitalize', planColors[plan] ?? planColors.starter)}>
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
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
