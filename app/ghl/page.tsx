import Link from 'next/link';
import { Metadata } from 'next';
import {
  Users, MessageSquare, BarChart3, Globe,
  CheckCircle2, ArrowRight, Layers, Bot, TrendingUp, Star, Zap,
} from 'lucide-react';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra for GoHighLevel — Website + AI Worker + CRM for Every Sub-Account',
  description: 'Kyra adds a 30+ page SEO website, an AI worker, and a full CRM to every GHL sub-account. White-label, multi-client, one dashboard. The Business in a Box that GHL agencies need.',
};

const features = [
  {
    icon: Globe,
    title: 'AI Website Builder',
    desc: '30+ page SEO website generated for each client — service pages, city pages, blog, FAQ, contact. All indexed by Google. All with lead capture forms.',
  },
  {
    icon: Bot,
    title: 'AI Worker on Every Site',
    desc: 'Chat widget that books appointments, captures leads, answers questions 24/7. Trained on each client\'s business automatically.',
  },
  {
    icon: Layers,
    title: 'Multi-Client Dashboard',
    desc: 'Manage 30 clients\' websites, AI workers, and leads from one dashboard. Deploy a new client in under 10 minutes.',
  },
  {
    icon: MessageSquare,
    title: 'Conversations Inbox',
    desc: 'See every message your AI workers send and receive — across all clients in one feed. Filter by client or channel.',
  },
  {
    icon: Zap,
    title: 'GHL Workflow Triggers',
    desc: 'When your AI handles a conversation, fire any GHL workflow automatically. Tag contacts, notify team, send follow-ups.',
  },
  {
    icon: TrendingUp,
    title: 'Growth Engine',
    desc: 'AI analyzes search trends and suggests new SEO pages. One click to generate and publish. Sites grow their organic traffic over time.',
  },
];

const comparison = [
  { feature: 'AI chat / SMS responses', kyra: true, ghl: true },
  { feature: '30+ page SEO website per client', kyra: true, ghl: false },
  { feature: 'AI-generated service & city pages', kyra: true, ghl: false },
  { feature: 'Growth Engine — ongoing SEO pages', kyra: true, ghl: false },
  { feature: 'Lead capture forms on every page', kyra: true, ghl: false },
  { feature: 'White-label branding', kyra: true, ghl: false },
  { feature: 'Multi-client dashboard', kyra: true, ghl: false },
  { feature: 'Conversation logging & inbox', kyra: true, ghl: false },
  { feature: 'GHL workflow triggers from AI', kyra: true, ghl: false },
  { feature: 'Per-client AI isolation', kyra: true, ghl: false },
  { feature: 'Built-in CRM per client', kyra: true, ghl: false },
  { feature: 'Client billing management', kyra: true, ghl: false },
  { feature: 'Custom AI personality per client', kyra: true, ghl: false },
];

export default function GHLPage() {
  return (
    <div className="min-h-screen bg-white">

      <PublicNav />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-sm text-indigo-700 font-medium mb-8">
          <Star className="h-3.5 w-3.5 fill-indigo-500 text-indigo-500" />
          Built for GoHighLevel Agencies
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-tight tracking-tight mb-6">
          GHL gives them the CRM.<br />
          <span className="text-indigo-600">Kyra gives them the website, AI worker, and leads.</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Every GHL sub-account gets a 30+ page SEO website, an AI worker that handles conversations 24/7, and a CRM that captures every lead. Deployed in under 10 minutes. White-labeled under your brand.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup/agency"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition text-lg"
          >
            Start free — first site in 10 minutes
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/demo/dental"
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold px-8 py-4 rounded-xl transition text-lg"
          >
            See live demo
          </Link>
        </div>

        <p className="mt-4 text-sm text-gray-400">
          No credit card · 7-day free trial · White-label from day one
        </p>
      </section>

      {/* What Kyra adds that GHL doesn't */}
      <section className="max-w-4xl mx-auto px-6 pb-10">
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-6 py-4 text-sm text-indigo-700">
          <span className="font-semibold">The gap:</span>{' '}
          GHL is the best CRM and marketing platform for agencies. But it doesn&apos;t build websites, and its AI features are basic. Kyra fills both gaps — a full SEO website + trained AI worker per client, managed from one dashboard.
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          What GHL alone doesn&apos;t give your clients
        </h2>
        <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200 px-6 py-3">
            <span className="text-sm font-semibold text-gray-700">Feature</span>
            <span className="text-sm font-semibold text-indigo-600 text-center">GHL + Kyra</span>
            <span className="text-sm font-semibold text-gray-400 text-center">GHL Alone</span>
          </div>
          {comparison.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-3 px-6 py-3.5 items-center border-b border-gray-100 last:border-0 ${row.kyra && !row.ghl ? 'bg-indigo-50/30' : ''}`}
            >
              <span className="text-sm text-gray-700">{row.feature}</span>
              <div className="flex justify-center">
                {row.kyra
                  ? <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                  : <span className="h-5 w-5 text-gray-300 flex items-center justify-center text-lg leading-none">–</span>
                }
              </div>
              <div className="flex justify-center">
                {row.ghl
                  ? <CheckCircle2 className="h-5 w-5 text-gray-400" />
                  : <span className="text-gray-300 text-lg leading-none flex justify-center">–</span>
                }
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Business in a Box for every GHL client
          </h2>
          <p className="text-gray-500 text-center max-w-xl mx-auto mb-12">
            Website + AI worker + CRM + lead capture + Growth Engine. All deployed in minutes, all managed from your dashboard.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="rounded-xl bg-white border border-gray-200 p-6 space-y-3 hover:shadow-sm transition">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GHL Webhook spotlight */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-10 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="h-7 w-7 text-indigo-200" />
            <h2 className="text-2xl font-bold">GHL Workflow Triggers from AI conversations</h2>
          </div>
          <p className="text-indigo-100 text-lg mb-8 max-w-2xl">
            Every time your AI worker has a conversation, Kyra can fire any GHL workflow automatically.
            No manual handoffs. No dropped leads.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              'AI qualifies lead → GHL creates opportunity',
              'AI books appointment → GHL sends confirmation',
              'Website form submitted → GHL tags contact',
            ].map((example, i) => (
              <div key={i} className="rounded-xl bg-white/10 border border-white/20 p-4">
                <p className="text-sm text-indigo-100">{example}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-indigo-200">
            Setup: Agency Settings → GHL Workflow Trigger → paste webhook URL. Done in 60 seconds.
          </p>
        </div>
      </section>

      {/* How it works together */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">How GHL + Kyra work together</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              label: 'GHL handles',
              desc: 'CRM, pipeline, SMS routing, calendar, contacts — the marketing infrastructure.',
              color: 'border-orange-200 bg-orange-50',
              labelColor: 'text-orange-700',
            },
            {
              label: 'Kyra handles',
              desc: 'SEO websites, AI workers, lead capture, Growth Engine — the client-facing business.',
              color: 'border-indigo-200 bg-indigo-50',
              labelColor: 'text-indigo-700',
            },
            {
              label: 'You handle',
              desc: 'Billing your clients $500–2,000/mo and growing your agency. Kyra + GHL do the rest.',
              color: 'border-green-200 bg-green-50',
              labelColor: 'text-green-700',
            },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border-2 ${item.color} p-5`}>
              <p className={`font-bold text-sm mb-2 ${item.labelColor}`}>{item.label}:</p>
              <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          $99/mo for you. $500–2,000/mo from each client.
        </h2>
        <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
          Each client gets a 30+ page website, AI worker, CRM, and lead capture.
          You set the price. The margins are yours.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup/agency"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 py-4 rounded-xl transition text-lg"
          >
            Start free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold px-10 py-4 rounded-xl transition text-lg"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">No credit card required · 7-day free trial · Website + AI worker + CRM included</p>
      </section>

      <PublicFooter />
    </div>
  );
}
