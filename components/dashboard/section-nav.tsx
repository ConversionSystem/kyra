'use client';

// ── SectionNav ───────────────────────────────────────────────────────────────
// In-page navigation strip for sections that are no longer in the sidebar.
// Shown at the top of AI Worker, Automation, Insights, CRM, and Channels pages.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles, Bot, Zap as ZapIcon, GitBranch, Settings2,
  MessageCircle, Activity, Star, BarChart3, TrendingUp,
  Radio, Phone, ArrowRight,
} from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
  icon: React.ElementType;
  desc: string;
  section: 'ai' | 'channels' | 'automation' | 'insights';
}

const NAV_LINKS: NavLink[] = [
  // ── AI Worker ──
  { label: 'AI Templates',  href: '/agency/ai-setup',    icon: Sparkles,      desc: 'Configure AI personalities',        section: 'ai' },
  { label: 'AI Teams',      href: '/agency/agents',      icon: Bot,           desc: 'Route messages to the right agent', section: 'ai' },
  { label: 'Premium',       href: '/agency/templates',   icon: Star,          desc: 'Paid specialist workers',           section: 'ai' },

  // ── Channels (includes Chat Widget) ──
  { label: 'Channels',      href: '/agency/channels',    icon: Radio,         desc: 'SMS, Telegram, WhatsApp & more',    section: 'channels' },
  { label: 'Voice AI',      href: '/agency/voice',       icon: Phone,         desc: 'AI phone calls',                    section: 'channels' },
  { label: 'Chat Widget',   href: '/agency/widget',      icon: MessageCircle, desc: 'Web chat embed code',               section: 'channels' },

  // ── Automation ──
  { label: 'Automations',   href: '/agency/automations', icon: ZapIcon,       desc: 'Scheduled actions & triggers',      section: 'automation' },

  // ── Insights ──
  { label: 'Intelligence',  href: '/agency/analytics',   icon: TrendingUp,    desc: 'ROI metrics & conversation trends', section: 'insights' },
  { label: 'Performance',   href: '/agency/performance', icon: BarChart3,     desc: 'AI worker stats',                   section: 'insights' },
  { label: 'Token Usage',   href: '/agency/usage',       icon: Activity,      desc: 'Costs & activity per client',       section: 'insights' },
  { label: 'Revenue',       href: '/agency/revenue',     icon: TrendingUp,    desc: 'Revenue tracking',                  section: 'insights' },
];

const SECTION_LABELS: Record<string, string> = {
  ai:         '🤖 AI Worker',
  channels:   '📡 Channels',
  automation: '⚡ Automation',
  insights:   '📊 Insights',
};

export function SectionNav({ currentHref }: { currentHref: string }) {
  const pathname = usePathname();
  const active = currentHref || pathname;

  const currentLink = NAV_LINKS.find(l => l.href === active);
  if (!currentLink) return null;

  const siblings = NAV_LINKS.filter(
    l => l.href !== active && l.section === currentLink.section
  );

  return (
    <div className="border-b border-gray-100 bg-gray-50/60 px-4 sm:px-6 py-2">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[11px] font-semibold text-gray-400 mr-1 whitespace-nowrap">
          {SECTION_LABELS[currentLink.section]}:
        </span>

        {/* Current page — active pill */}
        <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5 whitespace-nowrap">
          <currentLink.icon className="h-3 w-3" />
          {currentLink.label}
        </span>

        {siblings.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-transparent hover:border-gray-200 rounded-full px-2.5 py-0.5 transition-colors whitespace-nowrap"
            title={link.desc}
          >
            <link.icon className="h-3 w-3" />
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
