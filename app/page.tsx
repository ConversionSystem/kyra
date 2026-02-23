import Link from 'next/link';
import type { Metadata } from 'next';
import DemoChat from './demo/[industry]/demo-chat';
import LeadCapture from '@/components/landing/lead-capture';

export const metadata: Metadata = {
  title: 'Kyra — AI Employees for GHL Agencies | Free to Start',
  description: 'Deploy white-labeled AI employees inside GoHighLevel. Responds to every SMS in 60 seconds, books appointments, updates CRM, escalates frustrated leads. Manage all clients from one dashboard.',
  openGraph: {
    title: 'Kyra — Give every GHL client an AI employee that actually works',
    description: 'Responds to every lead in 60 seconds. Books appointments. Updates CRM. Escalates to humans. One dashboard for all your agency clients. Free to start.',
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
  { emoji: '🦷', name: 'Dental', slug: 'dental', desc: 'Booking, insurance & follow-ups' },
  { emoji: '🏡', name: 'Real Estate', slug: 'realestate', desc: 'Lead qualification & tour booking' },
  { emoji: '🚗', name: 'Auto', slug: 'auto', desc: 'Inventory Q&A & test drive booking' },
  { emoji: '🌿', name: 'Cannabis', slug: 'cannabis', desc: 'Age verification & product education' },
  { emoji: '🍽️', name: 'Restaurant', slug: 'restaurant', desc: 'Reservations, menu & catering Q&A' },
  { emoji: '✨', name: 'Med Spa', slug: 'medspa', desc: 'Consultation booking & treatment info' },
];

const FEATURES = [
  { icon: '💬', title: 'Responds in 60 seconds', desc: 'Every inbound GHL SMS gets an intelligent reply — day or night.' },
  { icon: '👋', title: 'Greets new leads', desc: 'New contact enters CRM → AI sends a warm intro within 60 seconds.' },
  { icon: '📅', title: 'Books appointments', desc: 'Checks availability, confirms times, sends reminders automatically.' },
  { icon: '🧠', title: 'Knows the CRM context', desc: 'Reads tags, pipeline stage, and notes before every reply.' },
  { icon: '🏷️', title: 'Auto-tags contacts', desc: 'Updates CRM tags and writes notes after every conversation.' },
  { icon: '🚨', title: 'Escalates to humans', desc: 'Detects frustration, flags the lead, and emails your team instantly.' },
  { icon: '⛔', title: 'Handles opt-outs', desc: 'STOP keyword detected → contact tagged, never messaged again.' },
  { icon: '⏰', title: 'Respects business hours', desc: 'Configurable per client — no 3am texts.' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Connect GoHighLevel',
    desc: 'Paste your GHL Private Integration token. Takes 2 minutes. No coding.',
  },
  {
    step: '02',
    title: 'Customize the AI',
    desc: 'Pick a template, customize the personality, or click "✨ Generate with AI". Your brand, your voice.',
  },
  {
    step: '03',
    title: 'Go live. Get results.',
    desc: 'Your AI employee starts responding to leads immediately. Watch the conversation feed in real time.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50 bg-slate-900/80">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-sm">K</div>
            <span className="font-bold text-lg tracking-tight">Kyra AI</span>
          </div>
          <div className="hidden sm:flex items-center gap-8 text-sm text-slate-400">
            <a href="#how-it-works" className="hover:text-white transition">How it works</a>
            <a href="#industries" className="hover:text-white transition">Industries</a>
            <a href="#features" className="hover:text-white transition">Features</a>
            <Link href="/pricing" className="hover:text-white transition">Pricing</Link>
            <Link href="/blog" className="hover:text-white transition">Blog</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition hidden sm:block">
              Sign in
            </Link>
            <Link href="/get-demo" className="text-sm text-slate-300 hover:text-white transition hidden md:block border border-white/20 px-4 py-2 rounded-lg hover:border-white/40">
              Get a Demo
            </Link>
            <Link
              href="/signup/agency"
              className="bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20">
        {/* Pill badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse inline-block" />
            AI employees for your GoHighLevel clients
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Headline + CTA */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] mb-6 tracking-tight">
              Give every client an AI employee that{' '}
              <span className="text-indigo-400">actually works.</span>
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl leading-relaxed mb-8 max-w-lg">
              Responds to every GHL SMS in 60 seconds. Books appointments. Updates the CRM. Escalates to humans. All automatic — from one agency dashboard.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { value: '< 60s', label: 'Response time' },
                { value: '24/7', label: 'Always on' },
                { value: 'BYOK', label: 'Bring your own keys' },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup/agency"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-lg px-8 py-4 rounded-xl"
              >
                Get Started Free
                <span>→</span>
              </Link>
              <Link
                href="/demo/dental"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 transition text-white font-semibold text-lg px-8 py-4 rounded-xl"
              >
                See Live Demo
              </Link>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              Free during beta · No credit card required · Works with GoHighLevel
            </p>

            {/* Email capture for not-ready-to-signup visitors */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-slate-500 mb-2">Not ready yet? Get notified when we add new industries + features:</p>
              <LeadCapture />
            </div>
          </div>

          {/* Right: Animated phone mockup */}
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

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              How it works
            </div>
            <h2 className="text-3xl sm:text-4xl font-black">
              Live in under 10 minutes.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-4xl font-black text-indigo-400 mb-4">{step.step}</div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-14">
        <div className="max-w-6xl mx-auto px-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
            {[
              { value: '< 60s', label: 'Average response time', sub: 'to every inbound SMS' },
              { value: '9+', label: 'Active agencies', sub: 'managing clients on Kyra' },
              { value: '21', label: 'Industry templates', sub: 'ready to deploy' },
              { value: '100%', label: 'GHL compatible', sub: 'SMS, WA, IG, FB, Email' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-3xl font-black text-white mb-1">{s.value}</p>
                <p className="text-sm font-semibold text-slate-300">{s.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Quotes */}
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {[
              {
                quote: "I added Kyra to my dental client on a Friday. By Monday morning the AI had already booked 3 appointments while the office was closed. That's the pitch — it works while you sleep.",
                author: 'GHL Agency Owner',
                industry: '🦷 Dental client',
              },
              {
                quote: "The best part is I don't have to explain AI to my clients. I just show them the conversation history and say 'your AI handled this.' They see the bookings, they pay.",
                author: 'Digital Marketing Agency',
                industry: '🏡 Real estate + auto clients',
              },
            ].map(q => (
              <div key={q.quote} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-slate-300 text-sm leading-relaxed mb-4 italic">&ldquo;{q.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-600/40 border border-indigo-500/30 flex items-center justify-center text-sm">
                    {q.industry.split(' ')[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{q.author}</p>
                    <p className="text-xs text-slate-500">{q.industry}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Built on */}
          <div className="text-center">
            <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold mb-5">Built on</p>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {[
                { name: 'GoHighLevel', note: '60K agencies' },
                { name: 'OpenClaw', note: 'AI runtime' },
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

      {/* ── Industries ──────────────────────────────────────────────────── */}
      <section id="industries" className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              21 industry templates
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Works for every business.
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Pre-built AI personalities for the most common industries. Live demos below — no login required.
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
                    💬 Try it live
                  </Link>
                  <Link href={`/demo/${ind.slug}`}
                    className="flex-1 bg-white/10 hover:bg-white/15 text-slate-300 text-center text-xs font-medium py-2 px-3 rounded-lg transition border border-white/10">
                    Watch demo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              What Kyra does automatically
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Your client's AI never stops working.
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Every feature runs automatically inside your clients' GHL accounts. Zero manual work after setup.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* ── For agencies ────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                Built for GHL agencies
              </div>
              <h2 className="text-3xl sm:text-4xl font-black mb-6">
                One dashboard.<br />
                <span className="text-indigo-400">All your clients' AI.</span>
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                Manage every client's AI employee from a single agency dashboard. Conversations, analytics, escalations, personalities — all in one place. Your clients never see a terminal. They just see results.
              </p>
              <ul className="space-y-3">
                {[
                  'Per-client personality training',
                  'Live conversation feed with escalation alerts',
                  '7-day performance analytics per client',
                  'White-label — your brand, your clients',
                  'BYOK — clients bring their own OpenAI key',
                  'Weekly automated performance reports',
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
                  { value: '< 10 min', label: 'Time to add a client', sub: 'Template → live' },
                  { value: '< 10 min', label: 'Setup per client', sub: 'Template → live' },
                  { value: '21', label: 'Industry templates', sub: 'Ready to deploy' },
                  { value: '100%', label: 'Follow-up rate', sub: 'Every lead answered' },
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
                <p className="text-sm text-slate-500 mt-1">15 clients × $1,000/mo — $247 Kyra cost = $14,753 profit</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-indigo-600 rounded-2xl p-10 sm:p-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Deploy your first AI employee today.
            </h2>
            <p className="text-indigo-200 text-lg mb-8 max-w-lg mx-auto">
              Connect your GoHighLevel account. Pick a template. Go live in under 10 minutes. Free during beta.
            </p>
            <Link
              href="/signup/agency"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-black text-lg px-10 py-4 rounded-xl hover:bg-indigo-50 transition"
            >
              Get Started Free →
            </Link>
            <p className="text-indigo-300 text-sm mt-4">
              No credit card required · Free during beta · Works with GoHighLevel
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Product</h4>
              <ul className="space-y-2">
                {[{ href: '/try/dental', label: '💬 Try Live Demo' }, { href: '/pricing', label: 'Pricing' }, { href: '/changelog', label: 'Changelog' }, { href: '/vs', label: 'vs. Chatbots' }, { href: '/roi', label: 'ROI Calculator' }, { href: '/get-demo', label: 'Get a Demo' }].map(l => (
                  <li key={l.href}><Link href={l.href} className="text-sm text-slate-500 hover:text-white transition">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Live Demos</h4>
              <ul className="space-y-2">
                {[{ href: '/try/dental', label: '🦷 Dental AI' }, { href: '/try/realestate', label: '🏡 Real Estate AI' }, { href: '/try/auto', label: '🚗 Auto AI' }, { href: '/try/cannabis', label: '🌿 Cannabis AI' }, { href: '/try/restaurant', label: '🍽️ Restaurant AI' }, { href: '/try/medspa', label: '✨ Med Spa AI' }].map(l => (
                  <li key={l.href}><Link href={l.href} className="text-sm text-slate-500 hover:text-white transition">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Resources</h4>
              <ul className="space-y-2">
                {[{ href: '/blog', label: 'Blog' }, { href: '/help', label: 'Help & FAQ' }, { href: '/blog/ghl-ai-employee-agency', label: 'Agency Playbook' }, { href: '/blog/agency-recurring-revenue-ai', label: '$10K/mo Guide' }, { href: '/blog/ai-for-dental-practices', label: 'Dental AI Guide' }].map(l => (
                  <li key={l.href}><Link href={l.href} className="text-sm text-slate-500 hover:text-white transition">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Company</h4>
              <ul className="space-y-2">
                {[{ href: '/privacy', label: 'Privacy Policy' }, { href: '/terms', label: 'Terms of Service' }, { href: '/signup/agency', label: 'Sign Up Free' }, { href: '/login', label: 'Sign In' }].map(l => (
                  <li key={l.href}><Link href={l.href} className="text-sm text-slate-500 hover:text-white transition">{l.label}</Link></li>
                ))}
                <li><a href="mailto:angel@conversionsystem.com" className="text-sm text-slate-500 hover:text-white transition">Contact Support</a></li>
                <li><a href="https://conversionsystem.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-white transition">Conversion System</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-black text-xs">K</div>
              <span className="font-bold text-sm">Kyra AI</span>
              <span className="text-slate-600 text-sm">by Conversion System</span>
            </div>
            <p className="text-slate-600 text-xs">© 2026 Conversion System. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}