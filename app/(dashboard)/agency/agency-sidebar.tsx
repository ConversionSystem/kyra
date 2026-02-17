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
  starter: 'border-blue-200 bg-blue-50 text-blue-600',
  pro: 'border-indigo-200 bg-indigo-50 text-indigo-600',
  scale: 'border-amber-200 bg-amber-50 text-amber-600',
};

interface AgencySidebarProps {
  agencyName: string;
  plan: string;
}

export function AgencySidebar({ agencyName, plan }: AgencySidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <Link
          href="/chat"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-3"
        >
          <ChevronLeft className="h-3 w-3" />
          Back to Chat
        </Link>
        <h2 className="text-lg font-semibold text-gray-900 truncate">
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
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
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
