import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra Changelog — AI Workforce Platform',
  description: 'See what\'s new in Kyra. Regular updates, new features, and improvements to the AI workforce platform.',
};

const UPDATES = [
  {
    date: 'March 17, 2026',
    tag: 'Platform Health',
    tagColor: 'bg-green-100 text-green-700',
    title: '70+ bugs fixed — every dashboard now production-grade',
    desc: 'Full audit of every dashboard tab. Squashed silent failures, security holes, and broken UX across the entire platform.',
    items: [
      { emoji: '🐛', text: 'Secrets Vault (2), Skills (4), AI Personality (5), AI Templates (5) — all bugs fixed' },
      { emoji: '🔒', text: 'Security fix: admin permissions API exposed to non-admins — patched' },
      { emoji: '🔒', text: 'Security fix: export route used cached session instead of cryptographic auth — patched' },
      { emoji: '💬', text: 'Conversations (5), Channels (6), AI Teams (6), CRM (4) — all bugs fixed' },
      { emoji: '👑', text: 'Admin Accounts: credits upsert on first use, FK-safe delete, Sync to CRM restored' },
      { emoji: '⚙️', text: 'Settings delete button actually works now (was silently failing)' },
      { emoji: '🧹', text: 'Mission Control rewrite: removed 5 stacked banners + 3 overlapping onboarding systems' },
      { emoji: '🔌', text: 'GHL inline reconnect/disconnect — no page reload needed' },
      { emoji: '🚫', text: 'Removed duplicate /agency/ghl-setup page — now redirects correctly' },
    ],
  },
  {
    date: 'March 17, 2026',
    tag: 'Infrastructure',
    tagColor: 'bg-amber-100 text-amber-700',
    title: 'VPS cleanup: 21 dead containers killed, 28GB RAM freed',
    desc: 'Audited all 75 containers. Killed orphans and abandoned agencies. Every live container is now labeled and tracked.',
    items: [
      { emoji: '🖥️', text: '75 → 54 containers: killed 11 orphans + 10 abandoned zero-client agencies' },
      { emoji: '💾', text: 'RAM: 45GB → 17GB used (freed 28GB)' },
      { emoji: '🏷️', text: 'All 54 containers now labeled kyra.managed=true — fully trackable' },
      { emoji: '🔄', text: 'Rollback scripts: /opt/kyra/rollback-all.sh and update-all.sh for safe future upgrades' },
      { emoji: '⚠️', text: 'OpenClaw 2026.3.13 broken in Docker (silent port binding failure) — staying on v2026.3.8' },
    ],
  },
  {
    date: 'March 16, 2026',
    tag: 'Website Builder',
    tagColor: 'bg-indigo-100 text-indigo-700',
    title: 'AI Website Builder — inline page editor + live deploy pipeline',
    desc: 'Build, edit, and deploy client websites from inside Kyra. Full AI generation with inline editing per page.',
    items: [
      { emoji: '✏️', text: 'Inline page editor: edit H1, meta title, meta description, subtitle per page' },
      { emoji: '🚀', text: 'Build + deploy pipeline wired to VPS provisioner' },
      { emoji: '🔗', text: 'Sites linked to clients — each client can have their own AI-generated website' },
      { emoji: '📄', text: 'Bulk site creation page for agencies managing multiple clients' },
      { emoji: '🎨', text: 'Quick-start wizard + growth panel with lead tracking' },
      { emoji: '📱', text: 'Generic site template with real industry content and Unsplash photos' },
    ],
  },
  {
    date: 'March 15, 2026',
    tag: 'Launch',
    tagColor: 'bg-rose-100 text-rose-700',
    title: 'March 16 launch event — countdown + live pitch deck',
    desc: 'Built a live launch campaign with countdown timer, animated pitch deck, and GHL Marketplace materials.',
    items: [
      { emoji: '⏱️', text: 'Live countdown timer at /march-16 for the launch event' },
      { emoji: '📊', text: 'Full pitch deck with product demo, ROI, and agency pitch flow' },
      { emoji: '🛒', text: 'GHL Marketplace listing v3 — updated with AI workforce positioning' },
      { emoji: '🤝', text: '/pitch/agencies — dedicated agency partner acquisition page' },
    ],
  },
  {
    date: 'March 13–14, 2026',
    tag: 'Dashboard',
    tagColor: 'bg-blue-100 text-blue-700',
    title: 'Template quality, NAP audit redesign & SEO dashboard upgrades',
    desc: 'Major improvements to content rendering, SEO tooling, and template quality across the board.',
    items: [
      { emoji: '📋', text: 'Template markdown cleanup — proper rendering, empty states, real content' },
      { emoji: '🗺️', text: 'NAP Audit panel redesign — readable issues, directory links, grouped sections' },
      { emoji: '🔍', text: 'All 5 SEO tasks now testable from dashboard with full feature visibility' },
      { emoji: '🌍', text: 'GEO test timeout fixed + NAP data now shows after run' },
      { emoji: '📖', text: 'SEO onboarding PDF guide + Getting Started guide added to dashboard' },
      { emoji: '✏️', text: 'Content drafts UX, Telegraph publish, Reddit search — all fixed' },
    ],
  },
  {
    date: 'March 9–12, 2026',
    tag: 'Credits & Billing',
    tagColor: 'bg-green-100 text-green-700',
    title: 'Credit engine hardening + Stripe webhook guard',
    desc: 'Every AI action is now tracked and gated. Credits deduct across all chat paths with real-time balance tracking.',
    items: [
      { emoji: '💳', text: 'Stripe webhook credit guard — prevents double-granting on retries' },
      { emoji: '🔢', text: 'Credit deduction on ALL chat paths — GHL, widget, terminal, voice' },
      { emoji: '📊', text: 'Real-time credit tracking UI — balance updates after every message' },
      { emoji: '🪙', text: 'OpenClaw terminal usage now tracked and deducted via usage webhook' },
      { emoji: '🎁', text: 'Credits upsert on first use — new accounts no longer silently fail' },
    ],
  },
  {
    date: 'March 6–9, 2026',
    tag: 'Veterinary SEO',
    tagColor: 'bg-violet-100 text-violet-700',
    title: 'Vet SEO Worker — premium template for veterinary clinics',
    desc: 'Full AI-powered SEO/GEO worker for vets. Stacks content, monitors NAP, publishes to directories automatically.',
    items: [
      { emoji: '🐾', text: 'Veterinary SEO/GEO Worker — premium template at $99/mo' },
      { emoji: '📝', text: 'Semantic content stacking — Reddit, Telegraph, Web 2.0 publishing' },
      { emoji: '📍', text: 'NAP auditor — finds inconsistent citations across 30+ directories' },
      { emoji: '🌍', text: 'GEO tester — tracks AI search visibility for vet clinic keywords' },
      { emoji: '📊', text: 'SEO reporter — weekly reports delivered via OpenClaw' },
      { emoji: '🔗', text: 'Backlink monitor — tracks new links and domain authority changes' },
    ],
  },
  {
    date: 'March 4–6, 2026',
    tag: 'Navigation',
    tagColor: 'bg-slate-100 text-slate-700',
    title: 'Sidebar simplification + section collapse persistence',
    desc: 'Cleaner, faster navigation. Fewer links, better grouping, collapse state remembered across sessions.',
    items: [
      { emoji: '📱', text: 'Collapsible sidebar sections — state remembered across page loads' },
      { emoji: '🧹', text: 'Sidebar cleanup: removed 15+ redundant links, better grouping' },
      { emoji: '🎨', text: 'Light theme branding audit — consistent indigo across all dashboard pages' },
      { emoji: '🚫', text: 'Floating mic/keyboard button removed platform-wide' },
      { emoji: '👤', text: 'Avatar circles removed from client headers for cleaner UI' },
    ],
  },
  {
    date: 'March 1–3, 2026',
    tag: 'AI Teams',
    tagColor: 'bg-purple-100 text-purple-700',
    title: 'Multi-agent AI Teams + 30 new features across Mission Control',
    desc: 'AI Teams with smart department routing. Plus 30 Mission Control improvements including Pipelines, AI Suggest, and Marketing.',
    items: [
      { emoji: '🤖', text: 'Multi-Agent AI Teams: 5 department workers with smart keyword routing' },
      { emoji: '🏢', text: 'AI Teams config is now per-client (not agency-wide) — properly scoped' },
      { emoji: '🎯', text: 'Review Queue, Alert Rules, Memory Browser, Webhook Manager added' },
      { emoji: '📈', text: 'Pipeline analytics: conversion funnel + campaign leaderboard' },
      { emoji: '💡', text: 'AI Suggest wired into 5 dashboard pages' },
      { emoji: '🚀', text: 'Autopilot — proactive AI with weekly schedule' },
      { emoji: '📦', text: 'Business-in-a-Box — complete AI worker setup in 60 seconds' },
    ],
  },
  {
    date: 'February 22–23, 2026',
    tag: 'Major Release',
    tagColor: 'bg-indigo-100 text-indigo-700',
    title: '40+ features shipped overnight 🚀',
    desc: 'Biggest product sprint in Kyra\'s history. The platform went fully production-ready.',
    items: [
      { emoji: '💬', text: 'Live AI demo at /try/[industry] — real chat with no signup, 8 industries' },
      { emoji: '🎯', text: '/get-demo booking page — enterprise demo request form' },
      { emoji: '💰', text: 'Public /pricing page — 4 plans, FAQ, ROI calculator' },
      { emoji: '📖', text: 'SEO blog with 3 articles targeting agency + AI workforce keywords' },
      { emoji: '🗺️', text: 'sitemap.xml + robots.txt — SEO infrastructure' },
      { emoji: '🔗', text: 'Viral share button on live demo — LinkedIn, Twitter, email to team' },
      { emoji: '📣', text: 'Social proof section on landing page — stats, testimonials, tech stack' },
      { emoji: '🍽️', text: 'Restaurant + Med Spa demos added (6 total industries)' },
      { emoji: '🏷️', text: 'CEO Action Board — pending blockers with inline SQL copy' },
      { emoji: '🔔', text: 'Escalation webhook — Slack/Discord/Zapier when AI escalates a lead' },
      { emoji: '📲', text: 'Signup webhook — real-time Slack/Discord alert on new agency signups' },
      { emoji: '📧', text: 'Lead capture on landing page → Supabase + instant email alert' },
      { emoji: '⚖️', text: 'Privacy Policy + Terms of Service' },
    ],
  },
  {
    date: 'February 22, 2026',
    tag: 'Revenue',
    tagColor: 'bg-green-100 text-green-700',
    title: 'Billing, sequences, pitch pages & referral program',
    desc: 'Complete revenue flywheel built in a single sprint.',
    items: [
      { emoji: '💳', text: 'Billing page — Stripe checkout with plan cards and trial messaging' },
      { emoji: '✉️', text: '7-day email nurture sequence (activates once RESEND_API_KEY added)' },
      { emoji: '📊', text: 'White-label pitch pages per industry — shareable with prospects' },
      { emoji: '🎁', text: 'Referral program — agencies earn free months, /ref/AGENCY links' },
      { emoji: '📱', text: '4 new channels: web chat widget, email, WhatsApp direct, voice webhook' },
      { emoji: '🎨', text: 'Widget appearance configurator with live preview' },
    ],
  },
  {
    date: 'February 20, 2026',
    tag: 'Infrastructure',
    tagColor: 'bg-amber-100 text-amber-700',
    title: 'OVH VPS, per-client containers & agency portals',
    desc: 'Enterprise-grade infrastructure with isolated AI agents.',
    items: [
      { emoji: '🖥️', text: 'OVH VPS live: Docker + Traefik + per-client container architecture' },
      { emoji: '🔐', text: 'Agency owners get dedicated containers — separate from client AIs' },
      { emoji: '🌐', text: 'Public portal → real OpenClaw gateway redirect' },
      { emoji: '🔑', text: 'BYOK (Bring Your Own OpenAI Key) — wired to containers in real-time' },
      { emoji: '🎭', text: 'Personality settings push to container SOUL.md on save' },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <PublicNav />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full px-4 py-1.5 text-sm text-indigo-300 font-medium mb-4">
            Product Changelog
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">What&apos;s new in Kyra</h1>
          <p className="text-slate-400">We ship fast. Here&apos;s everything that&apos;s been built.</p>
        </div>

        <div className="space-y-10">
          {UPDATES.map((update, i) => (
            <div key={i} className="border-l-2 border-indigo-500/30 pl-6">
              {/* Date + tag */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-slate-400">{update.date}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${update.tagColor}`}>
                  {update.tag}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-black text-white mb-1">{update.title}</h2>
              <p className="text-slate-400 text-sm mb-4">{update.desc}</p>

              {/* Items */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <ul className="space-y-2">
                  {update.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className="shrink-0 text-base leading-tight">{item.emoji}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center pt-8 border-t border-white/10">
          <p className="text-slate-400 text-sm mb-4">Want to see what we&apos;re building next?</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/try/dental" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition">
              Try Live Demo →
            </Link>
            <Link href="/solo" className="bg-white/10 hover:bg-white/15 border border-white/10 text-white px-6 py-3 rounded-xl transition text-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
