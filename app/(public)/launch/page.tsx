import { Metadata } from 'next';
import Link from 'next/link';
import {
  LayoutDashboard, Brain, Shield, Rocket, Bot, Zap,
  Calendar, MessageSquare, BarChart3, Globe, Star, CreditCard,
} from 'lucide-react';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra — AI Workforce Platform for Agencies',
  description: 'Deploy autonomous AI workers for your clients. Each client gets a website, AI worker, and CRM. White-label. Built on OpenClaw. Start free.',
  openGraph: {
    title: 'Kyra — AI Workforce Platform for Agencies',
    description: 'Deploy autonomous AI workers for your clients. Website + AI worker + CRM per client. Start free.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kyra — AI Workforce Platform for Agencies',
    description: 'Deploy autonomous AI workers for your clients. Start free.',
  },
};

const CAPABILITIES = [
  {
    icon: Calendar,
    title: 'Books Appointments',
    desc: 'Detects booking intent, checks availability, confirms slots, syncs to your CRM calendar. No staff required.',
  },
  {
    icon: Brain,
    title: 'Remembers Everything',
    desc: 'Memory graph extracts entities and relationships from every conversation. Your AI worker knows the customer before they say hello.',
  },
  {
    icon: MessageSquare,
    title: '7 Channels — One Brain',
    desc: 'SMS, WhatsApp, Telegram, Discord, email, voice, and web chat. Same AI worker, same memory, every channel.',
  },
  {
    icon: Shield,
    title: 'Per-Client Isolation',
    desc: 'Each client gets their own AI container. Separate memory, separate personality, separate API keys. Zero data leakage.',
  },
  {
    icon: BarChart3,
    title: 'AI Lead Scoring & Pipeline',
    desc: 'Scores leads by buying intent. A/B tests outreach messages. Auto-follows up on stale deals. Moves pipeline stages autonomously.',
  },
  {
    icon: Star,
    title: 'Reviews & Payments',
    desc: 'Requests reviews post-service, routes by sentiment. Collects payments via Stripe links over SMS. Handles the full customer lifecycle.',
  },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Create account', desc: 'Free. No credit card. Under 2 minutes.' },
  { step: '2', title: 'Add a client', desc: 'Enter business name, industry, location. Pick a template.' },
  { step: '3', title: 'AI builds everything', desc: '15-25 page SEO website, trained AI worker, CRM, lead capture. Under 10 minutes.' },
  { step: '4', title: 'Go live', desc: 'AI worker starts responding to every inbound message. You bill the client.' },
];

const PLANS = [
  {
    name: 'Lite',
    price: '$99',
    period: '/mo',
    desc: '3 clients — each gets website + AI worker + CRM',
    revenue: '$1,500–2,400/mo charging $500–800/client',
    features: [
      '3 client AI workers',
      '15-25 page website per client',
      '5,000 credits/month',
      '500 web scrapes/month',
      'SMS, Telegram, web chat',
      'AI Sales Pipeline',
      '50+ industry templates',
    ],
    cta: 'Start with Lite',
    href: '/website-builder?plan=starter',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$299',
    period: '/mo',
    desc: '10 clients — full AI workforce with white-label',
    revenue: '$8,000–12,000/mo charging $800–1,200/client',
    features: [
      '10 client AI workers',
      'Everything in Lite',
      '15,000 credits/month',
      '2,000 web scrapes/month',
      'White-label branding',
      'Growth Engine (AI SEO)',
      'Review queue',
      'Priority support',
    ],
    cta: 'Start with Pro',
    href: '/website-builder?plan=pro',
    featured: true,
  },
  {
    name: 'Scale',
    price: '$499',
    period: '/mo',
    desc: '20 clients — dedicated infrastructure, full API access',
    revenue: '$20,000–40,000/mo charging $1,000–2,000/client',
    features: [
      '20 client AI workers',
      'Everything in Pro',
      '30,000 credits/month',
      '5,000 web scrapes/month',
      'Dedicated infrastructure',
      'Outbound webhooks + API',
      'Dedicated Slack support',
    ],
    cta: 'Start with Scale',
    href: '/website-builder?plan=scale',
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
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 text-sm font-medium text-indigo-700 mb-6">
            Built on OpenClaw — each client gets an isolated AI container
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
            <span className="text-gray-900">Not a chatbot.</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
              An AI workforce.
            </span>
          </h1>
          <p className="text-gray-500 text-lg mt-5 max-w-2xl mx-auto">
            Deploy autonomous AI workers for your clients. Each one books appointments, scores leads,
            manages the CRM, and handles every channel — 24/7. You keep the margin.
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
              href="/try/dental"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium py-3.5 px-6 transition text-sm"
            >
              Try a live demo
            </Link>
          </div>
        </div>
      </section>

      {/* The Problem → Solution */}
      <section className="px-4 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-indigo-600 text-sm font-semibold uppercase tracking-widest mb-3">The Problem</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
            70% of leads go to the competitor who responds first.
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Your clients miss calls after hours. Leads text at 11pm and never hear back. CRM automations
            break when customers go off-script. Hiring 24/7 staff costs $40K+/year — per client.
          </p>
          <p className="text-gray-900 font-bold text-lg mt-6">
            Kyra gives each client an AI worker that responds in under 60 seconds, books the appointment,
            updates the CRM, and follows up — without your team lifting a finger.
          </p>
        </div>
      </section>

      {/* Revenue Math */}
      <section className="bg-white border-y border-gray-200 px-4 py-14">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <p className="text-sm text-gray-500 mb-1">Your cost to Kyra</p>
              <p className="text-3xl font-black text-gray-900">$99–499<span className="text-base font-normal text-gray-400">/mo</span></p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <p className="text-sm text-gray-500 mb-1">You charge each client</p>
              <p className="text-3xl font-black text-gray-900">$500–2,000<span className="text-base font-normal text-gray-400">/mo</span></p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
              <p className="text-sm text-indigo-600 mb-1">Pro plan, 5 clients at $1,000/mo</p>
              <p className="text-3xl font-black text-indigo-600">$4,701<span className="text-base font-normal text-indigo-400">/mo margin</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* What Your AI Worker Does */}
      <section className="px-4 py-16 lg:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-indigo-600 text-sm font-semibold uppercase tracking-widest mb-3">What It Does</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              Everything a great employee does — at machine speed
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Each AI worker is autonomous. It reads the CRM, knows the business, and acts — not just responds.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="h-11 w-11 rounded-lg bg-indigo-50 flex items-center justify-center mb-4">
                  <c.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{c.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white border-y border-gray-200 px-4 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-indigo-600 text-sm font-semibold uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              First client live in under 10 minutes
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="h-10 w-10 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GHL Integration Callout */}
      <section className="px-4 py-14">
        <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-6 sm:p-8 text-center">
          <Globe className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
          <h3 className="text-xl font-black text-gray-900 mb-2">Deep GoHighLevel Integration</h3>
          <p className="text-gray-500 text-sm max-w-lg mx-auto mb-4">
            50+ native GHL tools. Your AI worker reads contacts, books appointments, moves pipeline stages,
            sends SMS, tags contacts, and creates opportunities — without Zapier or manual webhooks.
          </p>
          <Link
            href="/ghl"
            className="text-indigo-600 font-semibold text-sm hover:text-indigo-500 transition"
          >
            See GHL integration details →
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white border-y border-gray-200 px-4 py-16 lg:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-indigo-600 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              Your cost: $99–499/mo. Your client pays: $500–2,000/mo.
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Every plan includes website + AI worker + CRM per client. Save 20% annually.
              {' '}
              <Link href="/pricing" className="text-indigo-600 hover:underline">Full pricing →</Link>
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 border flex flex-col ${
                  plan.featured
                    ? 'border-indigo-600 ring-2 ring-indigo-600/20 bg-white'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.featured && (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-600 mb-2 block">Best for growing agencies</span>
                )}
                <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <p className="text-gray-500 text-sm mb-3">{plan.desc}</p>

                {/* Revenue callout */}
                <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4">
                  <p className="text-xs text-green-700 font-semibold">{plan.revenue}</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
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

          {/* Voice add-on teaser */}
          <div className="mt-5 text-center">
            <p className="text-gray-400 text-sm">
              Voice AI add-on: $79/mo for 300 calling minutes.
              {' '}
              <Link href="/pricing" className="text-indigo-600 hover:underline">See all options →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="px-4 py-14">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-indigo-600 text-sm font-semibold uppercase tracking-widest mb-3">Coming Soon</p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {['AI Voice Calls (in beta)', 'AI Sales Pipeline (in beta)', 'Custom Domains', 'Slack Integration'].map((item) => (
              <span key={item} className="bg-gray-100 border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-full">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white border-t border-gray-200 px-4 py-16 lg:py-24">
        <div className="max-w-xl mx-auto text-center">
          <Bot className="h-10 w-10 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
            Your first AI worker. Live in 10 minutes.
          </h2>
          <p className="text-gray-500 mb-6">
            Start free. No credit card. 50+ industry templates. Website + AI worker + CRM included.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/solo"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-8 rounded-xl transition text-sm"
            >
              <Rocket className="h-4 w-4" />
              Start Free — No Credit Card
            </Link>
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium py-3.5 px-6 transition text-sm"
            >
              Try the playground
            </Link>
          </div>
          <p className="text-gray-400 text-xs mt-4">Cancel anytime · Upgrade as you grow · Built on OpenClaw</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
