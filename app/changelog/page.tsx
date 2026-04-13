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
    date: 'April 10–13, 2026',
    tag: 'SEO/GEO',
    tagColor: 'bg-emerald-100 text-emerald-700',
    title: 'SEO/GEO Command Center — complete engine 🔍',
    desc: 'World-class SEO and GEO optimization built directly into the platform.',
    items: [
      { emoji: '📊', text: 'Unified Insights tab — SEO + GEO metrics side by side in a single dashboard' },
      { emoji: '🌍', text: 'GEO scores + NAP status API routes — real data from normalized tables' },
      { emoji: '🏙️', text: 'City data wired into content engine — city_service_areas feed the page assembler' },
      { emoji: '🏗️', text: 'GEO/NAP universalized — works for all industries, not just HVAC' },
      { emoji: '📈', text: 'Trend charts added to SEO dashboard with real historical data' },
      { emoji: '🧙', text: 'SEO wizard properly wired — step-by-step guided setup' },
      { emoji: '🎨', text: 'Light theme on SEO page — compliant with Kyra brand guidelines' },
      { emoji: '📝', text: 'Phase 5 publishers — GitHub Pages, Blogger, WordPress citation builders' },
      { emoji: '✅', text: 'Real SEO defaults — replaced all "Coming Soon" placeholders with actionable content' },
    ],
  },
  {
    date: 'April 3–10, 2026',
    tag: 'Admin & AI',
    tagColor: 'bg-red-100 text-red-700',
    title: 'Admin dashboard + AI Employee brain 🧠',
    desc: 'Full admin visibility and smarter AI workers for every client.',
    items: [
      { emoji: '🖥️', text: 'Admin dashboard — VPS health panel with memory, disk, CPU, container stats + action items' },
      { emoji: '🧠', text: 'AI Employee brain — intelligent response system wired into live GHL webhook handler' },
      { emoji: '📰', text: 'Blog system — auto-generated content + Google Search Console auto-submit' },
      { emoji: '🔔', text: 'Upgrade nudge on inbox tab for free plan users — drives conversion' },
      { emoji: '🔗', text: 'Stripe webhook URL auto-verification + live registration check' },
      { emoji: '🏷️', text: 'Settings > Workflows renamed to Autopilot — eliminates UX confusion' },
    ],
  },
  {
    date: 'March 29 – April 2, 2026',
    tag: 'Website Builder',
    tagColor: 'bg-sky-100 text-sky-700',
    title: 'Website Builder — professional templates & mobile-first 📱',
    desc: '28 section templates, 25 industry recipes, and fully responsive builds.',
    items: [
      { emoji: '🎨', text: '28 section templates — Hero, About, Services, FAQ, Testimonials, Gallery, and more' },
      { emoji: '🏭', text: '25 industry recipes — pre-configured layouts for dental, HVAC, restaurant, legal, and more' },
      { emoji: '📱', text: 'ALL section templates fully mobile-responsive — looks great on every device' },
      { emoji: '🖼️', text: '8 gallery presets — grid, masonry, carousel, and more' },
      { emoji: '🤖', text: 'AI custom HTML engine with security sanitizer and quality checker' },
      { emoji: '4️⃣', text: '4 new modern templates + fixed 2 overlapping template issues' },
      { emoji: '🔧', text: 'Section reordering, variant switching, add/remove sections, FAQ editor, page duplication' },
    ],
  },
  {
    date: 'March 18–28, 2026',
    tag: 'Platform Audit',
    tagColor: 'bg-orange-100 text-orange-700',
    title: 'Full platform audit — 50+ bugs fixed 🔧',
    desc: 'Comprehensive quality sweep across every feature.',
    items: [
      { emoji: '🔒', text: 'Security hardening — API headers, debug auth, GHL webhook verification + CI gate' },
      { emoji: '🐛', text: 'Clients dashboard audit — 19 fixes including 3 critical security issues' },
      { emoji: '💬', text: 'Conversations, Channels, AI Teams, CRM — 30+ bugs squashed across all dashboards' },
      { emoji: '📱', text: 'Mobile responsiveness across ALL 67 pages — tablet and desktop included' },
      { emoji: '🎨', text: 'Branding audit — light theme consistency, eliminated green accents, unified indigo brand' },
      { emoji: '🗑️', text: 'Dashboard audit — removed 35 dead pages, consolidated features (-15,772 lines of code)' },
      { emoji: '🔐', text: 'Secrets vault — encrypted API key storage for client AI agents' },
      { emoji: '📋', text: 'Terminal, Settings, Referral, Billing — 25+ individual audit fixes' },
    ],
  },
  {
    date: 'March 10–17, 2026',
    tag: 'AI Workers',
    tagColor: 'bg-violet-100 text-violet-700',
    title: '77 AI Workers — every industry covered 🤖',
    desc: 'From 8 templates to 77 specialized AI workers with deep personas.',
    items: [
      { emoji: '🤖', text: '77 AI workers total — HR, Creative, SaaS, Finance, Real Estate, E-Commerce, Supply Chain, and more' },
      { emoji: '🛠️', text: '50 native GHL skills across 7 domains — contacts, deals, calendars, invoices, campaigns' },
      { emoji: '✍️', text: 'Write confirmation flow — AI proposes actions, user confirms before execution' },
      { emoji: '📊', text: 'Action audit log with dashboard UI — see everything your AI has done' },
      { emoji: '🎯', text: 'Smart routing — Sales catches pricing questions, Support catches frustration signals' },
      { emoji: '🏷️', text: 'Worker use case labels — customer-facing vs internal classification' },
      { emoji: '🔐', text: 'AI worker security hardening — industry blocking, liability disclaimers, persona auditing' },
    ],
  },
  {
    date: 'March 4–9, 2026',
    tag: 'Voice & CRM',
    tagColor: 'bg-teal-100 text-teal-700',
    title: 'Voice AI + CRM mega-upgrade 📞',
    desc: 'Real phone calls, deal automation, and a production-grade CRM.',
    items: [
      { emoji: '📞', text: 'Kyra Native — Twilio phone provisioning + real AI voice calls' },
      { emoji: '🎤', text: 'OpenAI Whisper transcription for voice calls' },
      { emoji: '💰', text: 'CRM Phase 1-4 — enrichment, scoring, deals auto-create, rules, analytics, CSV import' },
      { emoji: '🔄', text: 'Deals Kanban board — drag-and-drop pipeline management' },
      { emoji: '📧', text: 'Send SMS/Email directly from CRM — no switching tools' },
      { emoji: '🧠', text: 'AI Memory — cross-contact intelligence, competitive intel, revenue forecasting' },
      { emoji: '🤝', text: 'Deal Autopilot — automatic follow-up sequences with multi-touch sales engine' },
      { emoji: '📊', text: 'Pipeline analytics — conversion funnel, campaign leaderboard, AI closer stats' },
    ],
  },
  {
    date: 'February 26 – March 3, 2026',
    tag: 'Revenue Engine',
    tagColor: 'bg-green-100 text-green-700',
    title: 'AI Sales Pipeline + Smart Routing 💰',
    desc: 'Autonomous outbound sales and intelligent cost optimization.',
    items: [
      { emoji: '🎯', text: 'AI Sales Pipeline — find, research, personalize, and launch outbound campaigns in one click' },
      { emoji: '🤖', text: 'AI Closer — autonomous sales agent powered by OpenClaw with function calling' },
      { emoji: '🔄', text: 'kyra-router — intelligent AI model routing that saves 60-90% on LLM costs' },
      { emoji: '💳', text: 'Multi-model credits — variable credit cost per AI model (cheaper models = cheaper credits)' },
      { emoji: '🎁', text: 'Referral Machine — double-sided rewards, early bird 48h bonus, viral loop, streak rewards' },
      { emoji: '📈', text: 'Real leads from Google Maps + Apollo.io integration for B2B discovery (275M+ contacts)' },
      { emoji: '🔑', text: 'BYOK (Bring Your Own Key) — any provider bypasses kyra-router for zero markup' },
      { emoji: '🛡️', text: 'Prompt injection defense — three-layer protection for all AI messages' },
    ],
  },
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
      { emoji: '22', text: '22 active containers running across 9 agencies' },
    ],
  },
];

// Count total items across all updates
const totalFeatures = UPDATES.reduce((sum, u) => sum + u.items.length, 0);

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
          <p className="text-slate-400">
            We ship fast. {totalFeatures}+ features shipped since launch.{' '}
            <span className="text-indigo-400">Updated weekly.</span>
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Features shipped', value: `${totalFeatures}+` },
            { label: 'AI Workers', value: '77' },
            { label: 'Weeks of shipping', value: '8' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
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
