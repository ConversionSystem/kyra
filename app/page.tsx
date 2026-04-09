import Link from 'next/link';
import type { Metadata } from 'next';
import DemoChat from './demo/[industry]/demo-chat';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra — Business in a Box for Agencies | AI Website Builder + AI Worker + CRM',
  description: 'Deploy a complete AI-powered business for your clients in 10 minutes. 15-25 page SEO-optimized website, AI worker, CRM, and lead capture — all from one dashboard. Agencies resell at $500-2,000/mo.',
  openGraph: {
    title: 'Kyra — Your clients get a website, an AI worker, and a full CRM. You get 10 minutes.',
    description: 'The AI workforce platform for agencies. 15-25 page SEO-optimized websites, AI workers, built-in CRM. Deploy in minutes, resell at 3x-10x markup.',
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
    { from: 'ai' as const, text: "Hi Maria! A routine cleaning is $150, or fully covered with most insurance. We're accepting new patients — want to book?", delay: 1100 },
    { from: 'contact' as const, text: 'Yes! Do you have anything this week?', delay: 800 },
    { from: 'ai' as const, text: 'Tuesday at 2pm or Thursday at 10am. Which works? And which insurance do you have?', delay: 1000 },
    { from: 'contact' as const, text: 'Tuesday works. I have Delta Dental', delay: 700 },
    { from: 'ai' as const, text: "Reserved! Tuesday 2pm, Smile Dental. With Delta Dental you're fully covered. Confirmation text coming tomorrow morning!", delay: 1300 },
  ],
};

const INDUSTRIES = [
  { emoji: '🦷', name: 'Dental', slug: 'dental', desc: '20-page site + appointment booking AI + review requests' },
  { emoji: '🏡', name: 'Real Estate', slug: 'realestate', desc: 'Neighborhood pages + buyer/seller AI + lead pipeline' },
  { emoji: '🚗', name: 'Auto', slug: 'auto', desc: 'Inventory pages + test drive booking + lead capture' },
  { emoji: '🌿', name: 'Cannabis', slug: 'cannabis', desc: 'Menu pages + age verification + order routing' },
  { emoji: '🍽️', name: 'Restaurant', slug: 'restaurant', desc: 'Menu site + reservations AI + catering coordination' },
  { emoji: '✨', name: 'Med Spa', slug: 'medspa', desc: 'Treatment pages + consultation booking + follow-ups' },
  { emoji: '⚖️', name: 'Law Firm', slug: 'law-firm', desc: 'Up to 25-page site + intake AI + case routing' },
  { emoji: '🏠', name: 'HVAC', slug: 'hvac', desc: 'Service area pages + emergency dispatch + quote follow-up' },
  { emoji: '💇', name: 'Salon', slug: 'salon', desc: 'Service pages + appointment booking + rebooking reminders' },
];

const FEATURES = [
  { icon: '🌐', title: 'AI Website Builder', desc: '15-25 SEO-optimized pages generated in minutes. Service pages, city pages, blog, FAQ, contact — all written by AI, built for search engines.' },
  { icon: '🤖', title: 'AI Worker', desc: 'Chat widget on every site. Books appointments, captures leads, answers questions 24/7. Trained on the business automatically.' },
  { icon: '🌍', title: 'Web Intelligence', desc: "AI workers that can browse the web live — competitor pricing, company research, lead enrichment, industry news. Real-time data, automatically, on every client.", badge: 'New' },
  { icon: '📊', title: 'CRM Built-In', desc: 'Every lead from the website, chat, and GHL flows into one inbox. Nothing falls through the cracks.' },
  { icon: '📈', title: 'Growth Engine', desc: 'AI suggests new pages to grow your search presence. One click to generate and publish. Sites that keep growing with AI-generated content.' },
  { icon: '🏢', title: 'One Dashboard', desc: 'Manage 20 clients from one login. See every site, every lead, every conversation. White-label everything.' },
  { icon: '🔗', title: 'GHL Integration', desc: 'Connects to GoHighLevel in 2 minutes. AI replies to every SMS, email, and DM. AI booking, connected to your GHL Calendar.' },
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
            <span className="bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">New</span>
            Business in a Box — The AI Workforce Platform for Agencies
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Headline + CTA */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] mb-6 tracking-tight">
              The{' '}
              <span className="text-indigo-400">Business in a Box</span>
              {' '}for agencies.
              <br />
              <span className="text-white/80 text-3xl sm:text-4xl font-bold">Website. AI worker. CRM. Live in minutes.</span>
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl leading-relaxed mb-8 max-w-lg">
              Kyra builds a 15-25 page SEO-optimized website, deploys an AI worker, and sets up lead capture — all from one dashboard. Agencies resell at $500–2,000/mo.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { value: '15–25', label: 'SEO pages per client site' },
                { value: 'Free', label: '1 account free — no card needed' },
                { value: '3x–10x', label: 'Agency resale markup' },
                { value: '$99/mo', label: 'Lite plan — 3 clients' },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-white">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <Link
                href="/website-builder"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-lg px-8 py-4 rounded-xl"
              >
                Try It Free — Build Your First Site →
              </Link>
              <Link
                href="/try/dental"
                className="text-slate-400 hover:text-white transition font-medium text-lg"
              >
                See a Live Demo →
              </Link>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              1 free account included · No credit card needed
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

      {/* ── What Your Clients Get ─────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              One click. Your client gets<br />
              <span className="text-indigo-400">a complete AI-powered business.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Website + AI worker + CRM + lead capture + growth engine. All deployed in under 10 minutes. All managed from your dashboard.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className={`bg-white/5 border rounded-2xl p-5 ${f.badge ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : 'border-white/10'}`}>
                <div className="text-2xl mb-3">{f.icon}</div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-bold">{f.title}</h3>
                  {f.badge && (
                    <span className="bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full">{f.badge}</span>
                  )}
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built-in Intelligence ──────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              Under the hood
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Built-in Intelligence —{' '}
              <span className="text-indigo-400">Not Just Another Chatbot</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Every AI worker comes loaded with capabilities most platforms charge extra for.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🧠', title: 'Memory Graph', desc: 'AI remembers relationships between people, companies, and projects across every conversation.' },
              { icon: '📊', title: 'AI Lead Scoring', desc: 'Automatically scores and prioritizes hot leads based on conversation signals and engagement.' },
              { icon: '🔄', title: 'Deal Autopilot', desc: 'Drafts follow-ups for stale pipeline deals so nothing goes cold without a nudge.' },
              { icon: '🧪', title: 'A/B Testing', desc: 'Tests message variants with real conversation data to find what converts best.' },
              { icon: '🕵️', title: 'Competitive Intelligence', desc: 'Tracks competitor mentions in conversations and surfaces patterns you can act on.' },
              { icon: '🤖', title: 'Multi-Agent Routing', desc: '5 department agents route conversations by customer intent — sales, support, billing, scheduling, escalation.' },
              { icon: '💳', title: 'Payment Collection', desc: 'Send Stripe payment links directly via SMS — collect deposits, invoices, and fees in-conversation.' },
              { icon: '⭐', title: 'Review Management', desc: 'Automated review requests after service completion + AI-drafted responses to incoming reviews.' },
              { icon: '📈', title: 'Performance Tracking', desc: 'Per-worker metrics — response time, conversion rate, escalation rate, revenue influenced.' },
            ].map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold mb-1.5">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
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
                Manage every client&apos;s website, AI worker, and leads from a single dashboard. See every site, every lead, every conversation. You see problems before your clients do.
              </p>
              <ul className="space-y-3">
                {[
                  'Deploy a new client site + AI worker in under 10 minutes',
                  '15-25 page SEO-optimized website per client',
                  'AI worker trained on the business automatically',
                  'CRM captures every lead from website, chat, and GHL',
                  'Growth Engine suggests new pages to rank for',
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
                  { value: '< 10 min', label: 'Site + AI worker live', sub: 'From signup to deployed' },
                  { value: '15–25', label: 'Pages per site', sub: 'Auto-generated SEO content' },
                  { value: '24/7', label: 'AI worker coverage', sub: 'Never misses a lead' },
                  { value: '5x–10x', label: 'Resale markup', sub: '$99 cost → $500–2,000 revenue' },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-3xl font-black text-white">{s.value}</p>
                    <p className="text-sm text-slate-300 mt-1 font-medium">{s.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-sm text-slate-400 mb-1">Typical agency revenue on Pro plan (10 clients)</p>
                <p className="text-3xl font-black text-green-400">$8,000–12,000/mo</p>
                <p className="text-sm text-slate-500 mt-1">10 clients x $800–1,200/mo — $299 Kyra cost</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-sm text-slate-400 mb-3">What it replaces</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Manual setup</p>
                    <p className="text-2xl font-black text-red-400">40+ hours</p>
                    <p className="text-xs text-slate-500 mt-1">Per client: website, chat, CRM, content</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Kyra</p>
                    <p className="text-2xl font-black text-green-400">10 min</p>
                    <p className="text-xs text-slate-500 mt-1">Website + AI worker + CRM, done</p>
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
              First client live in under 10 minutes.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Sign up and add a client',
                desc: 'Create your agency account, enter your client\'s business info. Kyra generates a 15-25 page SEO-optimized website, deploys an AI worker, and sets up the CRM — automatically.',
              },
              {
                step: '02',
                title: 'Customize and connect',
                desc: 'Tweak the site content, adjust the AI personality, connect GHL if you use it. The AI worker starts handling leads immediately across chat, SMS, and email.',
              },
              {
                step: '03',
                title: 'Bill your client and grow',
                desc: 'Charge $500–2,000/mo per client. Use the Growth Engine to add new SEO pages monthly. Manage your entire portfolio from one dashboard.',
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
              Every vertical
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Website + AI worker for every industry.
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Each client gets a full SEO website, an AI worker trained on their business, and a CRM — deployed in minutes. Pick an industry, see it live.
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
                    Build this site
                  </Link>
                  <Link href={`/demo/${ind.slug}`}
                    className="flex-1 bg-white/10 hover:bg-white/15 text-slate-300 text-center text-xs font-medium py-2 px-3 rounded-lg transition border border-white/10">
                    See it live
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What agencies do with Kyra ──────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              What agencies do with Kyra
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                before: 'Build an HVAC website + AI worker in minutes',
                after: 'Charge client $800/mo',
                icon: '🏠',
              },
              {
                before: 'Manage 15 clients from one dashboard',
                after: '10 hours/week saved',
                icon: '🏢',
              },
              {
                before: 'AI handles 80% of customer questions',
                after: 'Agency focuses on growth',
                icon: '🤖',
              },
            ].map((item) => (
              <div key={item.before} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <p className="text-white font-bold mb-2">{item.before}</p>
                <p className="text-green-400 font-black text-lg">{item.after}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Real margin math ─────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">The math is obvious.</h2>
            <p className="text-slate-400 text-lg">What Kyra costs you vs. what you charge clients.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                plan: 'Lite — $99/mo',
                clients: '3 clients',
                kyra: '$99/mo',
                charge: 'Charge $500–800/mo each',
                revenue: '$1,500–2,400/mo revenue',
                margin: '$1,400–2,300/mo margin',
                color: 'border-white/10',
              },
              {
                plan: 'Pro — $299/mo',
                clients: '10 clients',
                kyra: '$299/mo',
                charge: 'Charge $800–1,200/mo each',
                revenue: '$8,000–12,000/mo revenue',
                margin: '$7,750–11,750/mo margin',
                color: 'border-indigo-500/50',
                highlight: true,
              },
              {
                plan: 'Scale — $499/mo',
                clients: '20 clients',
                kyra: '$499/mo',
                charge: 'Charge $500–1,000/mo each',
                revenue: '$10,000–20,000/mo revenue',
                margin: '$9,500–19,500/mo margin',
                color: 'border-white/10',
              },
            ].map((m) => (
              <div key={m.plan} className={`bg-white/5 border ${m.color} rounded-2xl p-6 ${m.highlight ? 'ring-1 ring-indigo-500/50' : ''}`}>
                {m.highlight && <div className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Most popular</div>}
                <p className="text-white font-black text-lg mb-1">{m.plan}</p>
                <p className="text-slate-400 text-sm mb-4">{m.clients}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Your Kyra cost</span>
                    <span className="text-red-400 font-semibold">{m.kyra}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">You charge</span>
                    <span className="text-white font-semibold">{m.charge}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between">
                    <span className="text-slate-400">Monthly revenue</span>
                    <span className="text-green-400 font-bold">{m.revenue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-semibold">Your margin</span>
                    <span className="text-green-400 font-black">{m.margin}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-sm mt-6">
            * Margin = client revenue minus Kyra subscription. Does not include your time, custom work, or add-on services you charge separately.
          </p>
        </div>
      </section>

      {/* ── Built on ──────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-14">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold mb-5">Built on</p>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {[
                { name: 'OpenClaw', note: 'AI runtime' },
                { name: 'GoHighLevel', note: 'CRM integration' },
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
              Your first client site. Live in 10 minutes.
            </h2>
            <p className="text-indigo-200 text-lg mb-8 max-w-lg mx-auto">
              15-25 page SEO-optimized website. AI worker. CRM. Lead capture. All deployed from one dashboard — no code, no infrastructure, no waiting.
            </p>
            <Link
              href="/website-builder"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-black text-lg px-10 py-4 rounded-xl hover:bg-indigo-50 transition"
            >
              Try It Free — Build Your First Site →
            </Link>
            <p className="text-indigo-300 text-sm mt-4">
              1 free account included · No credit card needed
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />

    </div>
  );
}
