'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Zap, Search, MessageSquare, Shield, Smartphone,
  ArrowRight, ChevronDown, ChevronUp, Sparkles, FileText,
  Clock, MapPin, Bot, CheckCircle2,
  TrendingUp, X, Check,
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: '01',
    icon: MessageSquare,
    title: 'Answer 5 Questions',
    desc: 'Business name, industry, services, location, brand colors. That\'s it.',
    detail: 'Our AI uses your answers to understand your business deeply and generate content that sounds like you wrote it.',
  },
  {
    num: '02',
    icon: Sparkles,
    title: 'AI Generates Everything',
    desc: '15-25 premium pages, SEO meta tags, JSON-LD schema, FAQ sections, and more.',
    detail: 'Not 5 generic pages. Full service pages, location pages, about, contact, FAQ - all optimized for search from day one.',
  },
  {
    num: '03',
    icon: Zap,
    title: 'Go Live Instantly',
    desc: 'Custom domain, SSL, hosted on our infrastructure. AI chat widget auto-trained on your content.',
    detail: 'Your site is live, indexed, and working for you. The AI chat widget already knows everything about your business.',
  },
];

const FEATURES = [
  { icon: FileText, title: '15-25 SEO-Optimized Pages', desc: 'Not 5 generic ones. Full service pages, location pages, and content that actually ranks.' },
  { icon: MapPin, title: 'Local SEO That Works', desc: 'Service pages built to rank for "[service] + [city]" searches your customers are making right now.' },
  { icon: Search, title: 'Automatic Schema Markup', desc: 'LocalBusiness, FAQ, and Service schema built in. Search engines understand your business instantly.' },
  { icon: Bot, title: 'AI Chat Widget', desc: 'Trained on YOUR website content. Answers customer questions 24/7, captures leads, books appointments.' },
  { icon: Smartphone, title: 'Mobile-Responsive Design', desc: 'Looks perfect on every device. No extra work. No separate mobile site.' },
  { icon: Shield, title: 'Custom Domain + Free SSL', desc: 'Connect your own domain or use ours. HTTPS included at no extra cost.' },
  { icon: TrendingUp, title: 'Growth Engine', desc: 'AI analyzes search data and suggests new pages to capture more traffic. Your site gets smarter over time.' },
];

const COMPARISON_FEATURES = [
  { label: 'Time to launch', diy: 'Weeks', wix: 'Days', dev: 'Months', kyra: '5 minutes' },
  { label: 'SEO optimization', diy: 'Manual', wix: 'Basic', dev: 'Depends', kyra: 'Automatic' },
  { label: 'AI chat trained on your site', diy: false, wix: false, dev: false, kyra: true },
  { label: 'Local SEO pages', diy: false, wix: 'Manual', dev: '$$$$', kyra: 'Automatic' },
  { label: 'Monthly cost', diy: 'Free + hours', wix: '$16-45', dev: '$3,000+', kyra: '$49' },
  { label: 'Updates & growth', diy: 'You', wix: 'You', dev: 'Pay more', kyra: 'AI-powered' },
];

const FAQS = [
  { q: 'How long does it take?', a: 'Under 5 minutes. Answer a few questions, and your full website is generated, optimized, and live.' },
  { q: 'Can I edit the content?', a: 'Yes. Every page is fully editable from your dashboard. Change text, images, or structure anytime.' },
  { q: 'Do I need a domain?', a: 'Not to start. We provide a free subdomain immediately. You can connect your own custom domain at any time.' },
  { q: 'What industries do you support?', a: '12+ built-in industry templates including dental, legal, restaurants, real estate, HVAC, med spas, and more.' },
  { q: 'Is it mobile-friendly?', a: 'Yes. Every site is responsive by default. Looks great on phones, tablets, and desktops.' },
  { q: 'What about SEO?', a: 'Schema markup, meta tags, XML sitemap, and optimized content are all generated automatically. No SEO expertise needed.' },
];

const COMPETITORS = ['DIY', 'Wix / Squarespace', 'Hiring a Developer', 'Kyra'];

// ── Animated mockup lines for hero ────────────────────────────────────────────

function BuildAnimation() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="bg-gray-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-gray-900">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <div className="ml-3 flex-1 bg-white/5 rounded-md px-3 py-1 text-[10px] text-gray-500 font-mono">
            yourbusiness.com
          </div>
        </div>
        {/* Page content skeleton */}
        <div className="p-5 space-y-4">
          <div className="space-y-2 animate-pulse">
            <div className="h-5 bg-indigo-600/30 rounded-lg w-3/4" />
            <div className="h-3 bg-white/10 rounded w-full" />
            <div className="h-3 bg-white/10 rounded w-5/6" />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 rounded-lg p-3 space-y-2 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                <div className="h-8 bg-indigo-600/20 rounded" />
                <div className="h-2 bg-white/10 rounded w-full" />
                <div className="h-2 bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 animate-pulse" style={{ animationDelay: '800ms' }}>
            <div className="h-8 bg-indigo-600/40 rounded-lg w-28" />
            <div className="h-8 bg-white/5 rounded-lg w-20" />
          </div>
          {/* AI chat bubble */}
          <div className="flex justify-end pt-1 animate-pulse" style={{ animationDelay: '1000ms' }}>
            <div className="bg-indigo-600/30 rounded-xl rounded-br-sm px-3 py-2 flex items-center gap-2">
              <Bot className="h-3 w-3 text-indigo-400" />
              <span className="text-[10px] text-indigo-300">AI Chat Ready</span>
            </div>
          </div>
        </div>
      </div>
      {/* Glow */}
      <div className="absolute -inset-4 bg-indigo-600/5 rounded-3xl blur-2xl -z-10" />
    </div>
  );
}

// ── FAQ Accordion Item ────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition"
      >
        <span className="text-sm font-medium text-white pr-4">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

// ── Comparison Cell ───────────────────────────────────────────────────────────

function CellValue({ value, isKyra }: { value: string | boolean; isKyra?: boolean }) {
  if (typeof value === 'boolean') {
    return value
      ? <CheckCircle2 className={`h-5 w-5 ${isKyra ? 'text-green-400' : 'text-green-400'}`} />
      : <X className="h-5 w-5 text-gray-600" />;
  }
  return <span className={isKyra ? 'text-white font-semibold' : 'text-gray-400'}>{value}</span>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WebsiteBuilderPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 bg-indigo-600/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-sm font-medium text-indigo-300 mb-6">
                <Zap className="h-3.5 w-3.5" /> AI Website Builder
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                AI-Powered Websites That Build{' '}
                <span className="text-indigo-400">Themselves</span>
              </h1>
              <p className="mt-5 text-lg text-gray-400 max-w-xl mx-auto lg:mx-0">
                Go from zero to a fully SEO-optimized, AI-trained website in under 5 minutes. No coding. No designers. Just results.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3.5 rounded-xl transition text-sm"
                >
                  Build Your Website <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-6 py-3.5 rounded-xl transition text-sm"
                >
                  See How It Works
                </a>
              </div>
              <div className="mt-6 flex items-center gap-5 justify-center lg:justify-start text-xs text-gray-500">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Under 5 min</span>
                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Free SSL</span>
                <span className="flex items-center gap-1"><Search className="h-3.5 w-3.5" /> SEO built-in</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <BuildAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">How It Works</h2>
            <p className="mt-3 text-gray-400 max-w-xl mx-auto">Three steps. Five minutes. A website that actually generates business.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="relative bg-gray-900/50 border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center group-hover:bg-indigo-600/30 transition">
                    <s.icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <span className="text-xs font-bold text-indigo-500 tracking-widest">STEP {s.num}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What You Get ───────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">Everything You Get</h2>
            <p className="mt-3 text-gray-400 max-w-xl mx-auto">Not a template. A complete business website built by AI, optimized for growth.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-gray-900/50 border border-white/10 rounded-2xl p-5 hover:border-indigo-500/20 transition">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 mb-10">One plan. Everything included. No surprises.</p>
          <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-8 sm:p-10 max-w-md mx-auto">
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="text-5xl font-bold text-white">$49</span>
              <span className="text-gray-400 text-lg">/month</span>
            </div>
            <p className="text-gray-500 text-sm mb-8">No setup fees. No hidden costs. Cancel anytime.</p>
            <ul className="space-y-3 text-left mb-8">
              {[
                '15-25 SEO-optimized pages',
                'Custom domain + free SSL',
                'AI chat widget trained on your site',
                'Automatic schema markup',
                'Mobile-responsive design',
                'AI-powered content updates',
                'Growth suggestions based on search data',
                'Hosting included',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/get-started"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition text-sm text-center"
            >
              Start Building
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Comparison ─────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">How Kyra Compares</h2>
            <p className="mt-3 text-gray-400 max-w-xl mx-auto">See why businesses choose Kyra over the alternatives.</p>
          </div>

          {/* Desktop grid */}
          <div className="hidden md:block">
            {/* Header row */}
            <div className="grid grid-cols-5 gap-3 mb-3">
              <div className="col-span-1" />
              {COMPETITORS.map((name, i) => (
                <div
                  key={name}
                  className={`text-center text-sm font-semibold py-3 rounded-xl ${
                    i === 3
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400'
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>
            {/* Feature rows */}
            {COMPARISON_FEATURES.map((row, ri) => (
              <div key={ri} className="grid grid-cols-5 gap-3 items-center py-3 border-b border-white/5 last:border-0">
                <div className="text-sm text-gray-300 font-medium">{row.label}</div>
                <div className="text-center text-sm"><CellValue value={row.diy} /></div>
                <div className="text-center text-sm"><CellValue value={row.wix} /></div>
                <div className="text-center text-sm"><CellValue value={row.dev} /></div>
                <div className="text-center text-sm"><CellValue value={row.kyra} isKyra /></div>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {COMPARISON_FEATURES.map((row, ri) => (
              <div key={ri} className="bg-gray-900/50 border border-white/10 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-3">{row.label}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">DIY</span>
                    <CellValue value={row.diy} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Wix</span>
                    <CellValue value={row.wix} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Developer</span>
                    <CellValue value={row.dev} />
                  </div>
                  <div className="flex justify-between items-center bg-indigo-600/10 rounded-lg px-2 py-1">
                    <span className="text-indigo-300 font-medium">Kyra</span>
                    <CellValue value={row.kyra} isKyra />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
            Ready to stop losing customers to your competitors&apos; websites?
          </h2>
          <p className="mt-4 text-gray-400 text-lg max-w-xl mx-auto">
            Your next customer is searching for your services right now. Make sure they find you.
          </p>
          <div className="mt-8">
            <Link
              href="/get-started"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl transition text-base"
            >
              Build Your Website Now <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
