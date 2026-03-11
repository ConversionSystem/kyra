import Link from 'next/link';
import type { Metadata } from 'next';
import DemoChat from './demo/[industry]/demo-chat';
import LiveStats from '@/components/landing/live-stats';
import ActivityTicker from '@/components/landing/activity-ticker';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra (Beta) — AI Workforce Platform for Agencies | 50+ Templates | Powered by OpenClaw',
  description: 'Deploy autonomous AI workers for your clients — free during beta. 50+ industry templates, ClawHub skills marketplace, white-label everything. No code, no infrastructure. Powered by OpenClaw.',
  openGraph: {
    title: 'Kyra — Deploy AI Workers for Your Clients',
    description: 'The AI workforce platform for agencies. 50+ industry templates, skills marketplace, white-label portals. Deploy your first AI worker in under 5 minutes.',
    url: 'https://kyra.conversionsystem.com',
  },
  alternates: { canonical: 'https://kyra.conversionsystem.com' },
};

// Hero demo — dental (clean, universally relatable)
const HERO_DEMO = {
  contactName: 'Maria Garcia',
  businessName: 'Smile Dental Clinic',
  accentColor: '#4f46e5',
  conversation: [
    { from: 'contact' as const, text: 'Hi, I need a cleaning. How much does it cost?', delay: 800 },
    { from: 'ai' as const, text: "Hi Maria! 😊 A routine cleaning is $150, or fully covered with most insurance. We're accepting new patients — want to book?", delay: 1100 },
    { from: 'contact' as const, text: 'Yes! Do you have anything this week?', delay: 800 },
    { from: 'ai' as const, text: 'Tuesday at 2pm or Thursday at 10am. Which works? And which insurance do you have?', delay: 1000 },
    { from: 'contact' as const, text: 'Tuesday works. I have Delta Dental', delay: 700 },
    { from: 'ai' as const, text: "✅ Reserved! Tuesday 2pm, Smile Dental. With Delta Dental you're fully covered. Confirmation text coming tomorrow morning!", delay: 1300 },
  ],
};

const INDUSTRIES = [
  { emoji: '🦷', name: 'Dental', slug: 'dental', desc: 'Books appointments, handles insurance Q&A, follows up automatically' },
  { emoji: '🏡', name: 'Real Estate', slug: 'realestate', desc: 'Qualifies leads, schedules tours, nurtures prospects 24/7' },
  { emoji: '🚗', name: 'Auto', slug: 'auto', desc: 'Answers inventory questions, books test drives, converts leads' },
  { emoji: '🌿', name: 'Cannabis', slug: 'cannabis', desc: 'Age verification, product education, order routing' },
  { emoji: '🍽️', name: 'Restaurant', slug: 'restaurant', desc: 'Reservations, menu questions, catering coordination' },
  { emoji: '✨', name: 'Med Spa', slug: 'medspa', desc: 'Consultation booking, treatment info, follow-up sequences' },
  { emoji: '⚖️', name: 'Law Firm', slug: 'law-firm', desc: 'Intake screening, consultation scheduling, case type routing' },
  { emoji: '🏠', name: 'HVAC', slug: 'hvac', desc: 'Emergency dispatch, seasonal maintenance booking, quote follow-up' },
  { emoji: '💇', name: 'Salon', slug: 'salon', desc: 'Appointment booking, service recommendations, rebooking reminders' },
];

const OPENCLAW_CAPABILITIES = [
  { icon: '⚡', title: 'Persistent operation', desc: 'Never turns off. Monitors every channel continuously — no trigger required.' },
  { icon: '🧠', title: 'Full memory', desc: 'Every contact, every conversation, every channel. Remembered forever across sessions.' },
  { icon: '🔧', title: 'Tool execution', desc: 'Books appointments, updates CRMs, sends messages, escalates — autonomously.' },
  { icon: '🔒', title: 'Per-client isolation', desc: 'Dedicated AI instance per client. Their context, their data, their worker.' },
  { icon: '🤖', title: 'Any AI model', desc: 'Claude, GPT-4, Gemini, or bring your own API keys. You choose the model.' },
  { icon: '📡', title: 'Every channel', desc: 'SMS, voice, WhatsApp, web chat, Telegram. One AI worker across all channels.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <PublicNav />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20">
        {/* Badge pill */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium">
            <span className="bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Beta</span>
            ⚡ OpenClaw-Powered · The AI Workforce Platform for Agencies
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Headline + CTA */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] mb-6 tracking-tight">
              Deploy{' '}
              <span className="text-indigo-400">AI workers</span>
              {' '}for your clients.
              <br />
              No code. No infra.
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl leading-relaxed mb-8 max-w-lg">
              Kyra is a white-label AI workforce platform for agencies. 50 industry templates, a skills marketplace, and one dashboard to manage every client&apos;s AI — all powered by OpenClaw.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { value: '50+', label: 'Industry templates' },
                { value: '< 60s', label: 'First response time' },
                { value: '24/7', label: 'Autonomous operation' },
                { value: 'Free', label: 'While in beta' },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-white">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/solo"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-lg px-8 py-4 rounded-xl"
              >
                Deploy Your First AI Worker →
              </Link>
              <Link
                href="/demo/dental"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 transition text-white font-semibold text-lg px-8 py-4 rounded-xl"
              >
                Watch It Work Live
              </Link>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              Free during beta · No credit card required · Works with GoHighLevel
            </p>
          </div>

          {/* Right: Animated chat demo */}
          <div className="flex justify-center lg:justify-end">
            <DemoChat
              conversation={HERO_DEMO.conversation}
              contactName={HERO_DEMO.contactName}
              businessName={HERO_DEMO.businessName}
              accentColor={HERO_DEMO.accentColor}
            />
          </div>
        </div>
      </section>

      {/* ── Problem Section ──────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              A chatbot answers questions.<br />
              <span className="text-indigo-400">An AI worker runs the business.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Most agencies are deploying the wrong thing. Here's the difference.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Column 1: Chatbots */}
            <div className="bg-white/5 border border-red-500/20 rounded-2xl p-6">
              <div className="text-2xl mb-3">❌</div>
              <h3 className="text-lg font-bold mb-1 text-red-400">Basic Chatbots</h3>
              <p className="text-xs text-slate-500 mb-4 uppercase tracking-widest">ManyChat, Tidio, etc.</p>
              <ul className="space-y-2.5">
                {[
                  'Wait to be messaged',
                  'Forget every conversation',
                  'Can\'t take autonomous action',
                  'One channel at a time',
                  'Stateless — no context',
                  'Triggers only',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="text-red-500 shrink-0">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Basic Automation */}
            <div className="bg-white/5 border border-yellow-500/20 rounded-2xl p-6">
              <div className="text-2xl mb-3">🔄</div>
              <h3 className="text-lg font-bold mb-1 text-yellow-400">Basic Automation</h3>
              <p className="text-xs text-slate-500 mb-4 uppercase tracking-widest">Zapier, GHL Workflows</p>
              <ul className="space-y-2.5">
                {[
                  'Fires on rigid triggers',
                  'No real intelligence',
                  'Breaks on unexpected input',
                  'No memory between runs',
                  'Can\'t handle nuance',
                  'Requires constant maintenance',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="text-yellow-500 shrink-0">~</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: OpenClaw AI Workers */}
            <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-2xl p-6">
              <div className="text-2xl mb-3">✅</div>
              <h3 className="text-lg font-bold mb-1 text-indigo-300">OpenClaw AI Workers</h3>
              <p className="text-xs text-indigo-500 mb-4 uppercase tracking-widest">Powered by Kyra</p>
              <ul className="space-y-2.5">
                {[
                  'Operates continuously, 24/7',
                  'Remembers every interaction, forever',
                  'Executes actions autonomously',
                  'Works across every channel',
                  'Full context on every contact',
                  'Proactive — acts without being asked',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="text-green-400 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── OpenClaw Section ─────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-indigo-900/50 border border-indigo-500/30 rounded-full px-4 py-1.5 text-sm font-medium text-indigo-300 mb-4">
              The infrastructure that makes it possible
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Powered by OpenClaw.<br />
              <span className="text-indigo-400">Built for autonomy.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              OpenClaw isn't a chatbot API. It's an AI runtime — the infrastructure that makes autonomous, persistent operation possible. Every Kyra AI worker runs on OpenClaw.
            </p>
          </div>

          {/* Runtime diagram */}
          <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-6 mb-10 max-w-3xl mx-auto font-mono text-sm">
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-4">Typical chatbot API</p>
            <p className="text-slate-400 mb-6">
              User message <span className="text-slate-600">→</span> OpenAI API <span className="text-slate-600">→</span> Response <span className="text-slate-600">→</span>{' '}
              <span className="text-red-400">Done. Forgotten.</span>
            </p>
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-4">OpenClaw AI runtime</p>
            <p className="text-slate-300">
              Continuous monitoring <span className="text-indigo-400">→</span> Context awareness <span className="text-indigo-400">→</span> Decision making{' '}
              <span className="text-indigo-400">→</span> Action execution <span className="text-indigo-400">→</span> Memory update{' '}
              <span className="text-indigo-400">→</span> <span className="text-green-400">Loop. Forever.</span>
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {OPENCLAW_CAPABILITIES.map((cap) => (
              <div key={cap.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-2xl mb-3">{cap.icon}</div>
                <h3 className="font-bold mb-1.5">{cap.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agency Command Center ─────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                Built for agencies
              </div>
              <h2 className="text-3xl sm:text-4xl font-black mb-6">
                One screen.<br />
                <span className="text-indigo-400">Every client. Full control.</span>
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                Manage every client's AI worker from a single command center. Health scores, escalation alerts, conversation feeds, revenue tracking — all in one place. You see problems before your clients do.
              </p>
              <ul className="space-y-3">
                {[
                  'Deploy a new client AI worker in under 5 minutes',
                  'Health scores and status for every deployed worker',
                  'Escalation alerts before your client even notices',
                  'Revenue tracking across your entire portfolio',
                  'Live conversation feed for every client',
                  'White-label — your brand, your clients, your revenue',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0 inline-block" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats + proof */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '< 5 min', label: 'Deploy per client', sub: 'Template → live' },
                  { value: '24/7', label: 'Coverage across channels', sub: 'Never misses a lead' },
                  { value: '50+', label: 'Industry templates', sub: 'Ready to deploy' },
                  { value: '1000+', label: 'Skills on ClawHub', sub: 'Install in one click' },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-3xl font-black text-white">{s.value}</p>
                    <p className="text-sm text-slate-300 mt-1 font-medium">{s.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-sm text-slate-400 mb-1">Typical agency revenue on Pro plan</p>
                <p className="text-3xl font-black text-green-400">$15,000/mo</p>
                <p className="text-sm text-slate-500 mt-1">15 clients × $1,000/mo — $249 Kyra cost = $14,751 profit</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-sm text-slate-400 mb-3">vs. hiring a human employee</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Human employee</p>
                    <p className="text-2xl font-black text-red-400">$3,500/mo</p>
                    <p className="text-xs text-slate-500 mt-1">+ benefits, sick days, turnover</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">1 Kyra AI worker</p>
                    <p className="text-2xl font-black text-green-400">$20/mo</p>
                    <p className="text-xs text-slate-500 mt-1">24/7, no sick days, never quits</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How to deploy ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              Deployment
            </div>
            <h2 className="text-3xl sm:text-4xl font-black">
              First AI worker live in under 5 minutes.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Sign up and add a client',
                desc: 'Create your agency account, add your first client. Kyra automatically provisions a dedicated AI worker with its own memory, tools, and channels.',
              },
              {
                step: '02',
                title: 'Pick a template and customize',
                desc: 'Choose from 50+ industry templates — dental, real estate, cannabis, law, HVAC, and more. Customize the personality, connect channels, and install skills from ClawHub.',
              },
              {
                step: '03',
                title: 'Deploy and manage from one dashboard',
                desc: 'Your AI worker goes live instantly across every connected channel. Monitor conversations, track performance, and manage your entire client portfolio from one screen.',
              },
            ].map((step) => (
              <div key={step.step} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-4xl font-black text-indigo-400 mb-4">{step.step}</div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ──────────────────────────────────────────────────── */}
      <section id="industries" className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              50+ industry templates
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              AI workers for every vertical.
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              50 pre-built templates across every major industry. Plus a community marketplace where agencies share and earn from their own. Live demos below.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INDUSTRIES.map((ind) => (
              <div
                key={ind.slug}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
              >
                <div className="text-4xl mb-3">{ind.emoji}</div>
                <h3 className="font-bold text-lg mb-1">{ind.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{ind.desc}</p>
                <div className="flex items-center gap-2">
                  <Link href={`/try/${ind.slug}`}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-center text-xs font-bold py-2 px-3 rounded-lg transition">
                    Deploy this worker
                  </Link>
                  <Link href={`/demo/${ind.slug}`}
                    className="flex-1 bg-white/10 hover:bg-white/15 text-slate-300 text-center text-xs font-medium py-2 px-3 rounded-lg transition border border-white/10">
                    Watch it work
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Marketplace Section ─────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              Extend &amp; earn
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Two marketplaces.<br />
              <span className="text-indigo-400">Infinite capabilities.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Install skills from ClawHub to extend what your AI workers can do. Create templates and earn credits when other agencies use them.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ClawHub */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-600/20 rounded-xl p-3 text-2xl">⚡</div>
                <div>
                  <h3 className="text-xl font-bold">ClawHub Skills Marketplace</h3>
                  <p className="text-slate-400 text-sm">Thousands of community-built skills</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Search and install skills directly from your dashboard. CRM integrations, email automation, calendar management, social media monitoring — if it exists on ClawHub, your AI worker can use it.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {['🔧 GitHub', '📧 Email Pro', '📅 Calendar', '🎨 Image Gen', '📊 Analytics', '🔍 SEO Tools'].map((s) => (
                  <div key={s} className="bg-white/5 rounded-lg px-3 py-2 text-xs text-slate-300 text-center">{s}</div>
                ))}
              </div>
            </div>

            {/* Template Marketplace */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-amber-600/20 rounded-xl p-3 text-2xl">🏪</div>
                <div>
                  <h3 className="text-xl font-bold">Community Template Marketplace</h3>
                  <p className="text-slate-400 text-sm">Create, share, and earn</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Built a great AI worker template for your niche? Publish it to the marketplace. Other agencies install it, and you earn credits — a new revenue stream from your expertise.
              </p>
              <div className="space-y-2">
                {[
                  { icon: '📤', text: 'Publish your custom template in minutes' },
                  { icon: '💰', text: 'Earn 5 credits every time it\'s installed' },
                  { icon: '📥', text: 'Browse and install community templates' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2.5">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Premium Workers ──────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-900/50 border border-amber-500/30 rounded-full px-4 py-1.5 text-sm font-medium text-amber-300 mb-4">
              Premium AI workers
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Specialized AI workers<br />
              <span className="text-amber-400">that run entire departments.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Beyond chat — AI workers that autonomously handle complex, ongoing work. Deploy once, let them run.
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/20 rounded-2xl p-8 max-w-3xl mx-auto">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-amber-600/20 rounded-xl p-3 text-3xl shrink-0">🔍</div>
              <div>
                <h3 className="text-xl font-bold text-amber-200">Veterinary SEO Worker</h3>
                <p className="text-slate-400 text-sm">10 skills · 7 publishing platforms · Fully autonomous</p>
              </div>
              <div className="ml-auto shrink-0">
                <span className="bg-amber-600/20 text-amber-300 text-sm font-bold px-3 py-1 rounded-lg">Premium</span>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              An autonomous SEO specialist that runs 24/7 — publishing content across 7 platforms, auditing 20 directories for NAP consistency, tracking AI citation rates, monitoring Reddit for mentions, and delivering weekly reports. No manual work required.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                '📊 Weekly GEO visibility testing',
                '📍 20-directory NAP consistency audit',
                '✍️ Auto-publish to 7 platforms',
                '💬 Reddit/UGC monitoring',
                '🔗 Backlink monitoring',
                '📱 Google Business Profile posts',
                '🏗️ JSON-LD schema markup',
                '📋 Weekly performance reports',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="text-amber-400 shrink-0">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-14">
        <div className="max-w-6xl mx-auto px-4">
          {/* Live stats */}
          <LiveStats />

          {/* Activity ticker */}
          <ActivityTicker />

          {/* Cannabis proof bar */}
          <div className="flex flex-wrap items-center justify-center gap-8 bg-green-950/60 border border-green-800/40 rounded-2xl px-8 py-5 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌿</span>
              <div>
                <p className="text-2xl font-black text-green-400">High volume</p>
                <p className="text-xs text-green-300/70">Cannabis + retail deployments</p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-green-800/40" />
            <div>
              <p className="text-sm font-bold text-white">Purple Lotus · The Flower Shop</p>
              <p className="text-xs text-slate-500">Powered by Kyra + OpenClaw AI workers</p>
            </div>
            <div className="hidden sm:block w-px h-8 bg-green-800/40" />
            <Link href="/try/cannabis" className="text-xs bg-green-700 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
              See cannabis AI worker →
            </Link>
          </div>

          {/* Proven Results */}
          <div className="mb-12">
            <p className="text-center text-xs text-slate-500 uppercase tracking-widest font-semibold mb-6">Proven results from real deployments</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  stat: 'High volume',
                  label: 'Cannabis + retail deployments',
                  desc: 'AI workers handling heavy nightly text traffic while staff focused on in-store customers.',
                  emoji: '💰',
                },
                {
                  stat: '< 60s',
                  label: 'Average first response',
                  desc: 'Every inbound message gets an intelligent reply in under 60 seconds — day, night, weekends, holidays.',
                  emoji: '⚡',
                },
                {
                  stat: '40+',
                  label: 'Messages handled in one shift',
                  desc: 'A single AI worker handled 40+ inbound texts during a Friday night rush while the dispensary team was at closing.',
                  emoji: '📲',
                },
              ].map(r => (
                <div key={r.stat} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-3xl mb-2">{r.emoji}</div>
                  <p className="text-3xl font-black text-white mb-1">{r.stat}</p>
                  <p className="text-sm font-semibold text-indigo-300 mb-3">{r.label}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Built on */}
          <div className="text-center">
            <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold mb-5">Built on</p>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {[
                { name: 'OpenClaw', note: 'Enterprise AI runtime' },
                { name: 'GoHighLevel', note: '60K agencies' },
                { name: 'OpenAI', note: 'GPT-4o' },
                { name: 'Stripe', note: 'Billing' },
                { name: 'Vercel', note: 'Infrastructure' },
              ].map(b => (
                <div key={b.name} className="text-center">
                  <p className="text-slate-400 font-semibold text-sm">{b.name}</p>
                  <p className="text-slate-600 text-xs">{b.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-indigo-600 rounded-2xl p-10 sm:p-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Your first AI worker. Live in 5 minutes.
            </h2>
            <p className="text-indigo-200 text-lg mb-8 max-w-lg mx-auto">
              Pick a template. Customize the personality. Deploy. 50+ industries ready to go — no code, no infrastructure, no waiting.
            </p>
            <Link
              href="/solo"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-black text-lg px-10 py-4 rounded-xl hover:bg-indigo-50 transition"
            >
              Try Kyra Free →
            </Link>
            <p className="text-indigo-300 text-sm mt-4">
              Free during beta · No credit card required · Powered by OpenClaw
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />

    </div>
  );
}
