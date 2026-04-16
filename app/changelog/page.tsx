import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra Changelog — AI Workforce Platform',
  description: 'See what\'s new in Kyra. Regular updates, new features, and improvements to the AI workforce platform.',
};

const UPDATES = [
  // ═══════════════════════════════════════════════════════════════════════
  // APRIL 2026
  // ═══════════════════════════════════════════════════════════════════════
  {
    date: 'April 15–16, 2026',
    tag: 'Power User',
    tagColor: 'bg-violet-100 text-violet-700',
    title: 'Command Palette, Keyboard Shortcuts & Dispatch Intelligence',
    desc: 'Pro-level navigation and smart delivery logistics in one sprint.',
    items: [
      { emoji: '⌘', text: 'Global Command Palette (⌘K) — instant fuzzy search across pages, clients, and actions' },
      { emoji: '⌨️', text: 'Keyboard Shortcuts (?) — GitHub-style hotkeys: G→H for home, G→C for clients, N for new worker' },
      { emoji: '🚚', text: 'Dispatch Intelligence Rule Engine — cutoff boost, breach alerts, cancel re-optimization' },
      { emoji: '📦', text: 'OnFleet integration hardened — 12 bug fixes for webhooks, task sync, and sandbox plans' },
      { emoji: '🔍', text: 'Algolia product search — ~4ms lookups replacing ~8s Firecrawl scraping' },
      { emoji: '📝', text: 'OpenClaw Fundamentals blog post + SEO/GEO content hardening' },
    ],
  },
  {
    date: 'April 14, 2026',
    tag: 'Platform',
    tagColor: 'bg-indigo-100 text-indigo-700',
    title: 'Dashboard Cleanup & Feature Gating',
    desc: 'Cleaner navigation, proper plan-based access control, and branding unification.',
    items: [
      { emoji: '🧹', text: 'Feature gating — Voice/SMS, Marketing, SEO/GEO, and Booking locked to appropriate plans' },
      { emoji: '🎨', text: 'Branding unification across all dashboard pages — consistent Kyra identity' },
      { emoji: '🔗', text: 'Real Google Search Console OAuth integration + expanded Settings page' },
      { emoji: '🐛', text: 'Big bug batch — GEO test, NAP audit, keywords save, widget, terminal nav fixes' },
      { emoji: '📊', text: 'Overview page now shows real data from connected services' },
      { emoji: '🔑', text: 'Admin login-as magic links for support and debugging' },
    ],
  },
  {
    date: 'April 8–12, 2026',
    tag: 'SEO',
    tagColor: 'bg-emerald-100 text-emerald-700',
    title: 'Unified SEO/GEO Command Center',
    desc: 'Complete search engine optimization toolkit built into every client dashboard.',
    items: [
      { emoji: '🌍', text: 'SEO/GEO Command Center — audit, fix, and universalize search presence in one dashboard' },
      { emoji: '📈', text: 'SEO tab added to all website pages (editor, growth, settings)' },
      { emoji: '🔧', text: 'HVAC SEO features — domain fallback, GA4, search engine submission, GSC sync' },
      { emoji: '🏗️', text: 'Custom website assemblers — pixel-perfect builds for TrustedNetworx, HVAC, Arana Painting' },
      { emoji: '📊', text: 'GA4 integration + search engine submission automation' },
      { emoji: '✅', text: 'Comprehensive SEO/GEO audit — 11 critical fixes for schema, meta, and structured data' },
    ],
  },
  // ═══════════════════════════════════════════════════════════════════════
  // MARCH 2026 (late)
  // ═══════════════════════════════════════════════════════════════════════
  {
    date: 'March 25–31, 2026',
    tag: 'Security',
    tagColor: 'bg-red-100 text-red-700',
    title: 'Security Hardening & Marketing Rewrite',
    desc: 'Two-phase security sprint plus honest, accurate marketing.',
    items: [
      { emoji: '🔒', text: 'P1 hardening — saga rollback, rate limiting, admin impersonation fix, billing tests' },
      { emoji: '🛡️', text: 'P2 hardening — 11 fixes across auth, billing, webhooks, and rate limiting' },
      { emoji: '🗑️', text: 'Production secrets scrubbed from git + PII exports deleted' },
      { emoji: '🩺', text: 'Container health cron — automatic gateway monitoring with polling hooks' },
      { emoji: '📢', text: 'Marketing funnel rewrite — removed false claims, surfaced hidden features across 14 pages' },
      { emoji: '🔐', text: 'Marketing dashboard locked to Kyra main agency only' },
    ],
  },
  {
    date: 'March 18–24, 2026',
    tag: 'Websites',
    tagColor: 'bg-cyan-100 text-cyan-700',
    title: 'Enterprise Chat Widget & Industry Templates',
    desc: 'Terpli-style chat experiences and more industries supported.',
    items: [
      { emoji: '💬', text: 'Enterprise widget dashboard — Terpli-style quick replies + clickable product links' },
      { emoji: '🏢', text: 'Telecom/IT industry template (Tech Enterprise) added' },
      { emoji: '🏠', text: 'Custom website assemblers — fully data-driven builds from content_sections' },
      { emoji: '📋', text: 'CRM timeline logging on website form submissions' },
      { emoji: '🔗', text: 'Product links fixed — no more raw HTML in chat responses' },
      { emoji: '🎯', text: 'Quick reply buttons now trigger product search properly' },
    ],
  },
  {
    date: 'March 10–17, 2026',
    tag: 'AI Sales',
    tagColor: 'bg-orange-100 text-orange-700',
    title: 'AI Sales Pipeline & CRM Overhaul',
    desc: 'Autonomous AI-powered sales prospecting from discovery to close.',
    items: [
      { emoji: '🤖', text: 'Autonomous AI Sales Pipeline — find, research, personalize, and launch outbound campaigns' },
      { emoji: '🧠', text: 'AI Closer — OpenClaw-powered autonomous sales agent that follows up and closes deals' },
      { emoji: '📊', text: 'CRM Phase 1-4 Complete — enrichment, scoring, deals auto-create, rules, analytics, import' },
      { emoji: '📧', text: 'Automated Follow-Up Sequences — multi-touch sales engine' },
      { emoji: '🔄', text: 'Deals Kanban + pipeline auto-sync + send SMS/email from CRM' },
      { emoji: '🌐', text: 'Apollo.io integration — 275M+ B2B contact discovery' },
      { emoji: '📇', text: 'Deep enrichment — phones, emails, socials, AI-generated killer emails' },
    ],
  },
  {
    date: 'March 1–9, 2026',
    tag: 'Growth',
    tagColor: 'bg-green-100 text-green-700',
    title: 'Credits, Outbound & Self-Serve Onboarding',
    desc: 'Complete revenue infrastructure and frictionless onboarding.',
    items: [
      { emoji: '💰', text: 'Unified credit system — every AI action tracked, gated, and deducted automatically' },
      { emoji: '📡', text: 'Channel 4: Outbound campaigns using Kyra\'s own AI workers via GHL' },
      { emoji: '🚀', text: 'Self-serve onboarding — fixes all 4 friction gaps in signup flow' },
      { emoji: '📊', text: 'VPS capacity monitor with auto-refresh and scale alerts' },
      { emoji: '🧠', text: 'Knowledge-powered AI workers — auto-train from client website content' },
      { emoji: '🛡️', text: 'Three-layer prompt injection defense on all AI messages' },
      { emoji: '🎯', text: 'Meta Pixel tracking + in-app webhook setup (no env vars needed)' },
      { emoji: '🇮🇳', text: 'HighLevel LIVE India 2026 campaign page' },
    ],
  },
  // ═══════════════════════════════════════════════════════════════════════
  // FEBRUARY 2026 (original entries preserved)
  // ═══════════════════════════════════════════════════════════════════════
  {
    date: 'February 22–23, 2026',
    tag: 'Major Release',
    tagColor: 'bg-indigo-100 text-indigo-700',
    title: '40+ features shipped overnight 🚀',
    desc: 'Biggest product sprint in Kyra\'s history. The platform is now fully production-ready.',
    items: [
      { emoji: '💬', text: 'Live AI demo at /try/[industry] — real chat with no signup, 8 industries' },
      { emoji: '🎯', text: '/get-demo booking page — enterprise demo request form' },
      { emoji: '💰', text: 'Public /pricing page — 4 plans, FAQ, ROI calculator' },
      { emoji: '📖', text: 'SEO blog with 3 articles targeting agency + AI workforce keywords' },
      { emoji: '🗺️', text: 'sitemap.xml + robots.txt — SEO infrastructure' },
      { emoji: '🔗', text: 'Viral share button on live demo — LinkedIn, Twitter, email to team' },
      { emoji: '📣', text: 'Social proof section on landing page — stats, testimonials, tech stack' },
      { emoji: '🍽️', text: 'Restaurant + Med Spa demos added (6 total industries)' },
      { emoji: '🏷️', text: 'CEO Action Board — pending blockers with inline SQL copy for Angel' },
      { emoji: '🔔', text: 'Escalation webhook — Slack/Discord/Zapier when AI escalates a lead' },
      { emoji: '📲', text: 'Signup webhook — real-time Slack/Discord alert on new agency signups' },
      { emoji: '📧', text: 'Lead capture on landing page → Supabase + instant email alert' },
      { emoji: '⚖️', text: 'Privacy Policy + Terms of Service' },
      { emoji: '📋', text: 'Marketplace listing copy — fully updated for all new features' },
      { emoji: '🚀', text: 'Launch Accelerator email updated with current traction' },
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
    date: 'February 22, 2026',
    tag: 'Analytics',
    tagColor: 'bg-blue-100 text-blue-700',
    title: 'Admin dashboard, analytics & live conversations',
    desc: 'Complete visibility into the platform\'s performance.',
    items: [
      { emoji: '📈', text: 'Admin MRR dashboard — total revenue, signups, plan breakdown' },
      { emoji: '🔴', text: 'Live conversation feed with LIVE indicator and escalation badges' },
      { emoji: '📊', text: 'Real performance analytics from client_conversations table' },
      { emoji: '🎯', text: 'One-click demo client with 5 seeded conversations' },
      { emoji: '⭐', text: 'Setup score on overview — shows agencies what to configure' },
    ],
  },
  {
    date: 'February 21, 2026',
    tag: 'Core AI',
    tagColor: 'bg-purple-100 text-purple-700',
    title: 'CRM automation, escalation & personality generation',
    desc: 'The AI worker now fully operates inside your CRM.',
    items: [
      { emoji: '🤖', text: '✨ Generate with AI — auto-writes full AI personality from business name' },
      { emoji: '📅', text: 'Calendar booking link — AI includes it when customers ask to schedule' },
      { emoji: '🚨', text: 'Smart escalation: frustrated customers → tags + email alert' },
      { emoji: '⛔', text: 'SMS opt-out + business hours per client' },
      { emoji: '🧠', text: 'Pipeline automation: CRM updates from every AI conversation' },
      { emoji: '💬', text: 'Conversation history: AI sees last 6 messages before replying' },
      { emoji: '👋', text: 'Proactive lead outreach: new contact → AI greets within 60s' },
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
      { emoji: '🏢', text: '22 active containers running across 9 agencies' },
    ],
  },
];

// ─── Stats bar ──────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Features shipped', value: '200+' },
  { label: 'Commits', value: '950+' },
  { label: 'Weeks of shipping', value: '8' },
  { label: 'Deploys', value: '100+' },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <PublicNav />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full px-4 py-1.5 text-sm text-indigo-300 font-medium mb-4">
            Product Changelog
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">What&apos;s new in Kyra</h1>
          <p className="text-slate-400">We ship fast. Here&apos;s everything that&apos;s been built.</p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-indigo-400">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Timeline */}
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
