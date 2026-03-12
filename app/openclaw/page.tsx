import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra — Deploy OpenClaw AI Workers to Every Client | Agency Platform',
  description: 'The only platform built for agencies running OpenClaw at scale. One dashboard. Every client. Autonomous AI workers deployed in 5 minutes.',
  openGraph: {
    title: 'Kyra — Deploy OpenClaw AI Workers to Every Client',
    description: 'The only platform built for agencies running OpenClaw at scale. One dashboard. Every client. Autonomous AI workers deployed in 5 minutes.',
  },
};

const REVENUE_TIERS = [
  { clients: 5, price: 297, total: 1485 },
  { clients: 15, price: 297, total: 4455 },
  { clients: 50, price: 297, total: 14850 },
];

const OPENCLAW_FEATURES = [
  {
    icon: '🔒',
    title: 'Per-client isolation',
    desc: 'Dedicated OpenClaw instance per client. Their context, their data, their worker — completely separated from every other account.',
  },
  {
    icon: '🔑',
    title: 'BYOK',
    desc: 'Claude, GPT-4, Gemini — your API keys, your cost control. Run any model without markup.',
  },
  {
    icon: '📡',
    title: 'Every channel',
    desc: 'SMS, WhatsApp, Instagram + Telegram, Discord, web chat. One AI worker, every touchpoint.',
  },
];

export default function OpenClawPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
      <PublicNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-24 text-center">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse inline-block" />
            ⚡ Built on OpenClaw · For Agencies
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] mb-6 tracking-tight">
          OpenClaw for agencies.<br />
          <span className="text-indigo-400">One dashboard. Every client.</span>
        </h1>

        <p className="text-slate-300 text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
          You've seen what OpenClaw can do. Kyra is how agencies deploy it to every client, manage it from one command center, and turn it into recurring revenue.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
            Watch 5-min Demo
          </Link>
        </div>
        <p className="text-sm text-slate-500 mt-4">Free to start · No credit card required</p>
      </section>

      {/* ── Problem Section ──────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              You've discovered OpenClaw. Now what?
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Running OpenClaw for one client is hard enough. Scaling it across 20+ clients without a command center is a nightmare.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '❌',
                title: '20 clients = 20 separate setups',
                desc: 'Every client is a manual configuration. No shared templates, no central visibility, no way to deploy at speed.',
              },
              {
                icon: '❌',
                title: 'No visibility across instances',
                desc: 'When an AI worker goes quiet on a client account, you find out when they call you — not before.',
              },
              {
                icon: '❌',
                title: 'No billing infrastructure',
                desc: "You're doing the AI work but have no clean way to charge for it, track it, or show clients the value.",
              },
            ].map((p) => (
              <div key={p.title} className="bg-red-50 border border-red-100 rounded-2xl p-6">
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{p.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution ─────────────────────────────────────────────────────── */}
      <section className="bg-indigo-600 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Kyra: the command center for your OpenClaw workforce
            </h2>
            <p className="text-indigo-200 text-lg max-w-xl mx-auto">
              One platform to deploy, manage, and monetize every OpenClaw AI worker across every client.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '✅',
                title: 'One dashboard — deploy + monitor all clients',
                desc: 'Your entire AI workforce from a single command center. Health scores, conversation feeds, escalation alerts.',
              },
              {
                icon: '✅',
                title: '5-min onboarding — template → live instantly',
                desc: "21 pre-built AI worker templates. Pick the industry, connect your CRM, and your client's AI worker is operating in under 5 minutes.",
              },
              {
                icon: '✅',
                title: 'Built-in billing — set your price, Stripe handles the rest',
                desc: 'White-label pricing built in. Set your monthly rate, Stripe collects it, you keep the margin.',
              },
            ].map((s) => (
              <div key={s.title} className="bg-white/10 border border-white/20 rounded-2xl p-6">
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-bold text-white mb-2">{s.title}</h3>
                <p className="text-indigo-100 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Revenue math ─────────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              What agencies are charging for this
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Agencies are bundling Kyra AI workers into their client retainers at $197–$497/mo per client. The math is straightforward.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {REVENUE_TIERS.map((tier) => (
              <div key={tier.clients} className="border border-slate-200 rounded-2xl p-6 text-center">
                <p className="text-slate-500 text-sm mb-2">{tier.clients} clients × ${tier.price}/mo</p>
                <p className="text-4xl font-black text-slate-900">${tier.total.toLocaleString()}/mo</p>
                <p className="text-slate-400 text-sm mt-1">new recurring revenue</p>
              </div>
            ))}
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-center">
            <p className="text-slate-700 text-lg font-semibold">
              Kyra Pro: <span className="text-indigo-600 font-black">$249/mo flat</span> for 10 clients + 1,500 credits/mo.
            </p>
            <p className="text-slate-500 mt-1">The margin is yours.</p>
          </div>
        </div>
      </section>

      {/* ── OpenClaw-specific features ────────────────────────────────────── */}
      <section className="bg-slate-900 border-t border-white/10 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-indigo-900/50 border border-indigo-500/30 rounded-full px-4 py-1.5 text-sm font-medium text-indigo-300 mb-4">
              Built for OpenClaw power users
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Everything you expect from OpenClaw.<br />
              <span className="text-indigo-400">Scaled across every client.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {OPENCLAW_FEATURES.map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-14">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { value: '24/7', label: 'Coverage across channels', emoji: '🌙' },
              { value: '< 60s', label: 'Average first response time', emoji: '⚡' },
              { value: '40+', label: 'Messages handled in one rush', emoji: '📲' },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-2xl mb-2">{s.emoji}</div>
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="text-slate-400 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-indigo-600 rounded-2xl p-10 sm:p-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Start deploying OpenClaw AI workers today.
            </h2>
            <p className="text-indigo-200 text-lg mb-8 max-w-lg mx-auto">
              Free to start. No credit card. Your first AI worker live in 5 minutes.
            </p>
            <Link
              href="/solo"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-black text-lg px-10 py-4 rounded-xl hover:bg-indigo-50 transition"
            >
              Deploy Your First AI Worker →
            </Link>
            <p className="text-indigo-300 text-sm mt-4">
              Free to start · OpenClaw-powered · Built for agencies
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
