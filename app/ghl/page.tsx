import Link from 'next/link';
import { Metadata } from 'next';
import {
  Users, MessageSquare, BarChart3, Globe,
  CheckCircle2, ArrowRight, Layers, Bot, TrendingUp, Star, Zap,
} from 'lucide-react';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra for GoHighLevel Agencies — The AI Employee Platform',
  description: 'GHL gave you an AI terminal. Kyra gives you an AI employee business. White-label, multi-client, conversation logging, GHL workflow triggers. For serious GHL agencies.',
};

const features = [
  {
    icon: Globe,
    title: 'White-Label Client Portals',
    desc: 'Every client gets a branded chat portal. Share a link — they chat with their AI. No Kyra branding, no GHL branding. Just yours.',
    ghl: false,
  },
  {
    icon: Layers,
    title: 'Multi-Client Portfolio Dashboard',
    desc: 'Manage 20 clients\' AI employees from one dashboard. Configure, monitor, and bill each one independently.',
    ghl: false,
  },
  {
    icon: MessageSquare,
    title: 'Conversations Inbox',
    desc: 'See every message your AI employees send and receive — across all clients in one feed. Filter by client or channel.',
    ghl: false,
  },
  {
    icon: Zap,
    title: 'GHL Workflow Triggers',
    desc: 'When your AI handles a conversation, fire any GHL workflow automatically. Tag contacts, notify team, send follow-ups — automatically.',
    ghl: false,
  },
  {
    icon: Bot,
    title: 'Per-Client AI Isolation',
    desc: 'Each client\'s AI is fully isolated — separate memory, separate personality, separate channels. No cross-contamination.',
    ghl: false,
  },
  {
    icon: TrendingUp,
    title: 'Client Billing Management',
    desc: 'Charge your clients $300-2000/mo for their AI employee. Kyra handles the billing layer so you focus on selling.',
    ghl: false,
  },
];

const comparison = [
  { feature: 'AI Terminal', kyra: true, ghl: true },
  { feature: 'White-label branding', kyra: true, ghl: false },
  { feature: 'Multi-client dashboard', kyra: true, ghl: false },
  { feature: 'Conversation logging & inbox', kyra: true, ghl: false },
  { feature: 'GHL workflow triggers from AI', kyra: true, ghl: false },
  { feature: 'Client share portals', kyra: true, ghl: false },
  { feature: 'Per-client isolation', kyra: true, ghl: false },
  { feature: 'Client billing management', kyra: true, ghl: false },
  { feature: 'Custom AI personality', kyra: true, ghl: false },
  { feature: 'Multi-channel (Telegram/SMS)', kyra: true, ghl: false },
  { feature: '\u{1F493} Heartbeat Protocol — AI checks in hourly, works toward client goals', kyra: true, ghl: false },
  { feature: '\u{1F4B0} Token Budget Manager — Per-client spend limits, model selection', kyra: true, ghl: false },
  { feature: '\u{1F4CA} Performance Telemetry — Weekly ROI reports, auto-emailed', kyra: true, ghl: false },
];

const testimonials: { name: string; company: string; revenue?: string; quote: string }[] = [];

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

        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
          GHL gave you an AI terminal.
          <br />
          <span className="text-indigo-600">Kyra gives you an AI employee business.</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Manage 20 clients&apos; AI employees from one white-label dashboard. Log every conversation.
          Trigger GHL workflows from AI conversations. Bill your clients on autopilot.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup/agency"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition text-lg"
          >
            Deploy your first AI employee free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="https://kyra.conversionsystem.com"
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold px-8 py-4 rounded-xl transition text-lg"
          >
            See live demo
          </Link>
        </div>

        <p className="mt-4 text-sm text-gray-400">
          Free to start · No credit card · White-label from day one
        </p>
      </section>

      {/* What's New */}
      <section className="max-w-4xl mx-auto px-6 pb-10">
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-6 py-4 text-sm text-indigo-700">
          <span className="font-semibold">{'\u{1F195}'} Just shipped:</span>{' '}
          Heartbeat Protocol, Token Budget Manager, and Performance Telemetry — the tools agencies need to prove AI ROI to their clients.
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          What GHL&apos;s basic terminal doesn&apos;t give you
        </h2>
        <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200 px-6 py-3">
            <span className="text-sm font-semibold text-gray-700">Feature</span>
            <span className="text-sm font-semibold text-indigo-600 text-center">Kyra</span>
            <span className="text-sm font-semibold text-gray-400 text-center">GHL Basic</span>
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
            The platform GHL agencies need
          </h2>
          <p className="text-gray-500 text-center max-w-xl mx-auto mb-12">
            Everything your agency needs to sell, manage, and bill AI employees at scale.
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
            Every time your AI employee has a conversation, Kyra can fire any GHL workflow automatically.
            No manual handoffs. No dropped leads.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              'AI qualifies lead → GHL creates opportunity',
              'AI handles service request → GHL notifies team',
              'AI answers FAQ → GHL tags contact as interested',
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

      {/* Early adopter CTA */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Be among the first GHL agencies on Kyra
          </h2>
          <p className="text-gray-500 mb-8">
            Early agencies get direct access to the founding team, priority support,
            and shape the roadmap. GHL + Kyra is a powerful combination — let&apos;s build it together.
          </p>
          <Link
            href="/signup/agency"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition"
          >
            Apply for early access
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Sell AI employees. Keep the margin.
        </h2>
        <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
          Kyra is your backend. You set the price for your clients.
          Agencies typically charge $300–$2,000/month per AI employee.
          See our plans for what Kyra costs you.
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
            href="/agency/plans"
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold px-10 py-4 rounded-xl transition text-lg"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">Free plan available · No credit card required</p>
      </section>

      <PublicFooter />
    </div>
  );
}
