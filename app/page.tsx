import Link from 'next/link';
import type { Metadata } from 'next';
import DemoChat from './demo/[industry]/demo-chat';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra — Business in a Box for Agencies | AI Website Builder + AI Worker + CRM',
  description: 'Deploy a complete AI-powered business for your clients in 10 minutes. 30+ page SEO website, AI worker, CRM, and lead capture — all from one dashboard. Agencies resell at $500-2,000/mo.',
  openGraph: {
    title: 'Kyra — Your clients get a website, an AI worker, and a full CRM. You get 10 minutes.',
    description: 'The AI workforce platform for agencies. 30+ page SEO websites, AI workers, built-in CRM. Deploy in minutes, resell at 5x markup.',
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
  { emoji: '🦷', name: 'Dental', slug: 'dental', desc: '35-page site + appointment booking AI + review requests' },
  { emoji: '🏡', name: 'Real Estate', slug: 'realestate', desc: 'Neighborhood pages + buyer/seller AI + lead pipeline' },
  { emoji: '🚗', name: 'Auto', slug: 'auto', desc: 'Inventory pages + test drive booking + lead capture' },
  { emoji: '🌿', name: 'Cannabis', slug: 'cannabis', desc: 'Menu pages + age verification + order routing' },
  { emoji: '🍽️', name: 'Restaurant', slug: 'restaurant', desc: 'Menu site + reservations AI + catering coordination' },
  { emoji: '✨', name: 'Med Spa', slug: 'medspa', desc: 'Treatment pages + consultation booking + follow-ups' },
  { emoji: '⚖️', name: 'Law Firm', slug: 'law-firm', desc: '40-page site + intake AI + case routing' },
  { emoji: '🏠', name: 'HVAC', slug: 'hvac', desc: 'Service area pages + emergency dispatch + quote follow-up' },
  { emoji: '💇', name: 'Salon', slug: 'salon', desc: 'Service pages + appointment booking + rebooking reminders' },
];

const FEATURES = [
  { icon: '🌐', title: 'AI Website Builder', desc: '30+ page SEO site generated in minutes. Service pages, city pages, blog, FAQ, contact — all written by AI, indexed by Google.' },
  { icon: '🤖', title: 'AI Worker', desc: 'Chat widget on every site. Books appointments, captures leads, answers questions 24/7. Trained on the business automatically.' },
  { icon: '📊', title: 'CRM Built-In', desc: 'Every lead from the website, chat, and GHL flows into one inbox. Nothing falls through the cracks.' },
  { icon: '📈', title: 'Growth Engine', desc: 'AI analyzes search trends and suggests new pages. One click to generate and publish. Sites that grow themselves.' },
  { icon: '🏢', title: 'One Dashboard', desc: 'Manage 30 clients from one login. See every site, every lead, every conversation. White-label everything.' },
  { icon: '🔗', title: 'GHL Integration', desc: 'Connects to GoHighLevel in 2 minutes. AI replies to every SMS, email, and DM. Books into GHL Calendar automatically.' },
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
              Your clients get a website, an{' '}
              <span className="text-indigo-400">AI worker</span>, and a full CRM.
              <br />
              <span className="text-indigo-400">You get 10 minutes.</span>
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl leading-relaxed mb-8 max-w-lg">
              Kyra builds a 30-page SEO website, deploys an AI worker, and sets up lead capture — all from one dashboard. Agencies resell at $500–2,000/mo.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { value: '30+', label: 'Pages per site, auto-generated' },
                { value: '< 10 min', label: 'From signup to live site' },
                { value: '5x', label: 'Avg agency resale markup' },
                { value: '$99/mo', label: 'Starting price' },
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
                href="/signup/agency"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-lg px-8 py-4 rounded-xl"
              >
                Start Free — First Site Live in 10 Minutes
              </Link>
              <Link
                href="/demo/dental"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 transition text-white font-semibold text-lg px-8 py-4 rounded-xl"
              >
                See It Live
              </Link>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              No credit card required · Cancel anytime · 7-day free trial
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
                  '30+ page SEO website generated per client',
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
                  { value: '30+', label: 'Pages per site', sub: 'Auto-generated SEO content' },
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
                <p className="text-sm text-slate-500 mt-1">10 clients x $800–1,200/mo — $249 Kyra cost</p>
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
                desc: 'Create your agency account, enter your client\'s business info. Kyra generates a 30+ page SEO website, deploys an AI worker, and sets up the CRM — automatically.',
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
                before: 'Build an HVAC website + AI worker in 8 minutes',
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
              30+ page website. AI worker. CRM. Lead capture. All deployed from one dashboard — no code, no infrastructure, no waiting.
            </p>
            <Link
              href="/signup/agency"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-black text-lg px-10 py-4 rounded-xl hover:bg-indigo-50 transition"
            >
              Start Free — Build Your First Site
            </Link>
            <p className="text-indigo-300 text-sm mt-4">
              No credit card required · 7-day free trial · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />

    </div>
  );
}
