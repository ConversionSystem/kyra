import { Metadata } from 'next';
import Link from 'next/link';
import { LayoutDashboard, Radio, Palette, Rocket, Bot, Zap } from 'lucide-react';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra — Deploy AI Workers for Your Clients in 60 Seconds',
  description: 'The white-label AI workforce platform for agencies. Deploy autonomous AI workers across 20+ channels. Start free.',
  openGraph: {
    title: 'Kyra — Deploy AI Workers for Your Clients in 60 Seconds',
    description: 'The white-label AI workforce platform for agencies. Deploy autonomous AI workers across 20+ channels.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kyra — Deploy AI Workers for Your Clients in 60 Seconds',
    description: 'The white-label AI workforce platform for agencies.',
  },
};

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'One Dashboard for All Clients',
    desc: 'Manage every AI worker, conversation, and client from a single agency dashboard. No more tab-switching chaos.',
  },
  {
    icon: Radio,
    title: '20+ Channels',
    desc: 'Telegram, WhatsApp, Discord, SMS, web chat, email, and more. Your AI workers meet customers wherever they are.',
  },
  {
    icon: Palette,
    title: 'White-Label Everything',
    desc: 'Your brand, your colors, your company name. White-label dashboard, portal, and chat widget. Custom domains coming soon.',
  },
];

const STATS = [
  { value: '35+', label: 'Agencies' },
  { value: '58', label: 'AI Workers Deployed' },
  { value: '20+', label: 'Channels Supported' },
];

const PLANS = [
  {
    name: 'Solo',
    price: 'Free',
    period: '',
    desc: 'For individuals who want their own AI worker',
    features: ['1 AI worker', 'Web chat', '50 credits/month', 'Basic CRM'],
    cta: 'Start Free',
    href: '/solo',
    featured: false,
  },
  {
    name: 'Lite',
    price: '$99',
    period: '/mo',
    desc: 'For small agencies getting started',
    features: ['5 AI workers', '10+ channels', '500 credits/month', 'White-label', 'CRM + pipeline'],
    cta: 'Get Started',
    href: '/signup/agency?plan=lite',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$299',
    period: '/mo',
    desc: 'For growing agencies scaling up',
    features: ['10 AI workers', '20+ channels', 'Full white-label', 'Priority support'],
    cta: 'Start Pro',
    href: '/signup/agency?plan=pro',
    featured: true,
  },
  {
    name: 'Scale',
    price: '$499',
    period: '/mo',
    desc: 'For agencies managing large portfolios',
    features: ['Unlimited workers', 'All channels', '5,000 credits/month', 'Custom branding', 'Dedicated support'],
    cta: 'Start Scale',
    href: '/signup/agency?plan=scale',
    featured: false,
  },
];

export default function LaunchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      {/* Hero */}
      <section className="bg-white border-b border-gray-200 px-4 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Deploy AI Workers
            </span>
            <br />
            <span className="text-gray-900">for Your Clients in 60 Seconds</span>
          </h1>
          <p className="text-gray-500 text-lg mt-5 max-w-2xl mx-auto">
            The white-label AI workforce platform for agencies. One dashboard. 20+ channels. Autonomous AI workers that actually work.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/solo"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-8 rounded-xl transition text-sm"
            >
              <Rocket className="h-4 w-4" />
              Start Free — No Credit Card
            </Link>
            <Link
              href="/workers"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium py-3.5 px-6 transition text-sm"
            >
              Browse AI Workers
            </Link>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="px-4 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-indigo-600 text-sm font-semibold uppercase tracking-widest mb-3">The Problem</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
            Agencies waste hours managing chatbots.
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Kyra gives you autonomous AI workers that handle customer conversations, manage CRMs, and run 24/7 — across every channel your clients need. No scripts. No babysitting.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-gray-200 px-4 py-16 lg:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-indigo-600 text-sm font-semibold uppercase tracking-widest mb-3">Why Kyra</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              Everything you need to run an AI agency
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="h-11 w-11 rounded-lg bg-indigo-50 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-4 py-14">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl sm:text-4xl font-black text-indigo-600">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white border-y border-gray-200 px-4 py-16 lg:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-indigo-600 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              Simple pricing. Start free.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 border ${
                  plan.featured
                    ? 'border-indigo-600 ring-2 ring-indigo-600/20 bg-white'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.featured && (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-600 mb-2 block">Most popular</span>
                )}
                <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                <div className="mt-2 mb-3">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
                </div>
                <p className="text-gray-500 text-sm mb-4">{plan.desc}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Zap className="h-3 w-3 text-indigo-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block text-center py-2.5 rounded-lg text-sm font-bold transition ${
                    plan.featured
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 lg:py-24">
        <div className="max-w-xl mx-auto text-center">
          <Bot className="h-10 w-10 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
            Ready to deploy your AI workforce?
          </h2>
          <p className="text-gray-500 mb-6">
            Start free. No credit card required. Your first AI worker is live in 60 seconds.
          </p>
          <Link
            href="/solo"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-8 rounded-xl transition text-sm"
          >
            <Rocket className="h-4 w-4" />
            Start Free — No Credit Card
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
