'use client';

// ── SectionNav ───────────────────────────────────────────────────────────────
// Lightweight cross-navigation strip shown at the top of AI Worker /
// Automation pages so users always know where they are and what's adjacent.
//
// Usage:
//   <SectionNav current="agents" />
//   <SectionNav current="autopilot" />

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles, Bot, Zap as ZapIcon, GitBranch, Settings2,
  MessageCircle, Activity, Star, ArrowRight,
} from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
  icon: React.ElementType;
  desc: string;
  section: 'ai' | 'automation' | 'insights';
}

const NAV_LINKS: NavLink[] = [
  // ── AI Worker section ──
  { label: 'AI Templates',    href: '/agency/ai-setup',   icon: Sparkles,   desc: 'Configure AI personalities',   section: 'ai' },
  { label: 'Smart Routing',   href: '/agency/agents',     icon: Bot,        desc: 'Route messages to the right agent', section: 'ai' },
  { label: 'Chat Widget',     href: '/agency/widget',     icon: MessageCircle, desc: 'Web chat embed',            section: 'ai' },
  { label: 'Premium Templates', href: '/agency/templates', icon: Star,      desc: 'Paid specialist workers',      section: 'ai' },
  // ── Automation section ──
  { label: 'Autopilot',       href: '/agency/autopilot',  icon: ZapIcon,    desc: 'Scheduled AI actions',         section: 'automation' },
  { label: 'Pipelines',       href: '/agency/pipelines',  icon: GitBranch,  desc: 'Multi-step workflows',         section: 'automation' },
  { label: 'Automations',     href: '/agency/automations', icon: Settings2,  desc: 'Trigger rules',               section: 'automation' },
  // ── Insights ──
  { label: 'Token Usage',     href: '/agency/usage',      icon: Activity,   desc: 'Costs & activity per client',  section: 'insights' },
];

const SECTION_LABELS: Record<string, string> = {
  ai: '🤖 AI Worker',
  automation: '⚡ Automation',
  insights: '📊 Insights',
};

export function SectionNav({ currentHref }: { currentHref: string }) {
  const pathname = usePathname();
  const active = currentHref || pathname;

  const currentLink = NAV_LINKS.find(l => l.href === active);
  if (!currentLink) return null;

  // Show sibling links in the same section + one key cross-section link
  const siblings = NAV_LINKS.filter(
    l => l.href !== active && l.section === currentLink.section
  );

  // Cross-section: AI → show Autopilot. Automation → show AI Templates.
  const crossLink =
    currentLink.section === 'ai'
      ? NAV_LINKS.find(l => l.href === '/agency/autopilot')
      : currentLink.section === 'automation'
      ? NAV_LINKS.find(l => l.href === '/agency/ai-setup')
      : null;

  const allLinks = crossLink ? [...siblings, crossLink] : siblings;

  return (
    <div className="border-b border-gray-100 bg-gray-50/60 px-4 sm:px-6 py-2">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[11px] font-semibold text-gray-400 mr-1 whitespace-nowrap">
          {SECTION_LABELS[currentLink.section]}:
        </span>
        {/* Current page — non-clickable pill */}
        <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5 whitespace-nowrap">
          <currentLink.icon className="h-3 w-3" />
          {currentLink.label}
        </span>

        {allLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-transparent hover:border-gray-200 rounded-full px-2.5 py-0.5 transition-colors whitespace-nowrap ${
              link.section !== currentLink.section ? 'opacity-70' : ''
            }`}
            title={link.desc}
          >
            <link.icon className="h-3 w-3" />
            {link.label}
            {link.section !== currentLink.section && (
              <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
