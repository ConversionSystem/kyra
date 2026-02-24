import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra Changelog — AI Workforce Platform',
  description: 'See what\'s new in Kyra. Regular updates, new features, and improvements to the AI employee platform.',
};

const UPDATES = [
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
      { emoji: '📖', text: 'SEO blog with 3 articles targeting GHL + agency keywords' },
      { emoji: '🗺️', text: 'sitemap.xml + robots.txt — SEO infrastructure' },
      { emoji: '🔗', text: 'Viral share button on live demo — LinkedIn, Twitter, email to team' },
      { emoji: '📣', text: 'Social proof section on landing page — stats, testimonials, tech stack' },
      { emoji: '🍽️', text: 'Restaurant + Med Spa demos added (6 total industries)' },
      { emoji: '🏷️', text: 'CEO Action Board — pending blockers with inline SQL copy for Angel' },
      { emoji: '🔔', text: 'Escalation webhook — Slack/Discord/Zapier when AI escalates a lead' },
      { emoji: '📲', text: 'Signup webhook — real-time Slack/Discord alert on new agency signups' },
      { emoji: '📧', text: 'Lead capture on landing page → Supabase + instant email alert' },
      { emoji: '⚖️', text: 'Privacy Policy + Terms of Service (required for GHL Marketplace)' },
      { emoji: '📋', text: 'GHL Marketplace listing copy — fully updated for all new features' },
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
    title: 'GHL automation, escalation & personality generation',
    desc: 'The AI employee now fully operates inside GoHighLevel.',
    items: [
      { emoji: '🤖', text: '✨ Generate with AI — auto-writes full AI personality from business name' },
      { emoji: '📅', text: 'GHL calendar booking link — AI includes it when customers ask to schedule' },
      { emoji: '🚨', text: 'Smart escalation: frustrated customers → tags + email alert' },
      { emoji: '⛔', text: 'SMS opt-out + business hours per client' },
      { emoji: '🧠', text: 'GHL pipeline automation: CRM updates from every AI conversation' },
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
            <Link href="/signup/agency" className="bg-white/10 hover:bg-white/15 border border-white/10 text-white px-6 py-3 rounded-xl transition text-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
