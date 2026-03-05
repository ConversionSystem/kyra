import Link from 'next/link';
import type { Metadata } from 'next';

import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
export const metadata: Metadata = {
  title: 'Kyra @ Launch — OpenClaw Agency Platform | March 16 Demo',
  description: 'Kyra turns OpenClaw into agency revenue. 60,000+ GHL agencies. One command center. Deploy in 5 minutes.',
};

const PLANS = [
  {
    name: 'Lite',
    price: '$99',
    period: '/mo',
    clients: 'Up to 3 clients',
    features: ['3 AI worker deployments', '500 credits/mo included', 'Agency command center', 'GHL + SMS + web chat', 'BYOK (any AI model)'],
  },
  {
    name: 'Pro',
    price: '$249',
    period: '/mo',
    clients: 'Up to 10 clients',
    highlight: true,
    features: ['10 AI worker deployments', '1,500 credits/mo included', 'White-label dashboard', 'Priority support', 'All channels'],
  },
  {
    name: 'Scale',
    price: '$499',
    period: '/mo',
    clients: 'Up to 30 clients',
    features: ['30 AI worker deployments', '2,500 credits/mo included', 'Custom onboarding', 'Dedicated success manager', 'SLA guarantee'],
  },
];

const PRODUCT_CARDS = [
  {
    icon: '🖥️',
    title: 'Agency Command Center',
    desc: "One dashboard for every client's AI worker. Health scores, escalation alerts, live conversation feeds. You see problems before your clients do.",
  },
  {
    icon: '⚡',
    title: '5-Min Deployment',
    desc: 'Connect a GHL sub-account. Pick an industry template. Done. 21 pre-built AI workers — dental, real estate, auto, cannabis, and more.',
  },
  {
    icon: '💳',
    title: 'White-Label Revenue',
    desc: 'Set your price. Stripe collects it. Agencies are charging $500–$2,000/mo per client. 10 clients on Pro = $9,970/mo in new recurring revenue.',
  },
  {
    icon: '🔑',
    title: 'BYOK + Any Model',
    desc: 'Claude, GPT-4, Gemini — your API keys, your cost control. No markup on AI compute. You own the margin.',
  },
];

export default function March16Page() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicNav />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-sm text-white">
              K
            </div>
            <span className="font-bold text-lg text-indigo-600 tracking-tight">Kyra</span>
          </div>
          <span className="text-sm text-slate-500 font-medium">
            Kyra × Launch · March 16–17, San Francisco
          </span>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-1.5 text-sm font-medium text-indigo-700 mb-8">
          OpenClaw Agency Platform · Launch Event Demo
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] mb-6 tracking-tight">
          The platform that turns OpenClaw into agency revenue.
        </h1>

        <p className="text-slate-500 text-xl leading-relaxed mb-12 max-w-2xl mx-auto">
          60,000 GHL agencies need this. None of them can build it themselves. We did.
        </p>

        {/* 3 Big Stat Cards */}
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { value: '60,000+', label: 'GHL agencies needing this', sub: 'The exact audience at Launch' },
            { value: 'Real-world', label: 'Deployments powering revenue', sub: 'Based on prior client work (pre-Kyra)' },
            { value: '5 min', label: 'To deploy a new AI worker', sub: 'Template → live, instantly' },
          ].map((s) => (
            <div key={s.label} className="border border-slate-200 rounded-2xl p-6 text-center">
              <p className="text-4xl font-black text-indigo-600 mb-1">{s.value}</p>
              <p className="text-slate-900 font-semibold text-sm">{s.label}</p>
              <p className="text-slate-400 text-xs mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              60,000 agencies discovered OpenClaw.<br />
              None can run it at scale.
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              OpenClaw is powerful. Running it across 20 clients without a platform is a manual nightmare.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                problem: 'Per-instance complexity',
                desc: "Each client requires a separate setup, separate monitoring, separate configuration. It doesn't scale past 3–4 clients without burning out.",
              },
              {
                problem: 'No billing infrastructure',
                desc: 'Agencies are doing the AI work but have no clean mechanism to charge for it, show clients value, or generate predictable recurring revenue.',
              },
              {
                problem: 'No command center',
                desc: 'When an AI worker goes quiet on a client account, they find out when their client calls them — not before. There is no fleet management.',
              },
            ].map((p) => (
              <div key={p.problem} className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="text-2xl mb-3">❌</div>
                <h3 className="font-bold text-slate-900 mb-2">{p.problem}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product ──────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Kyra solves all three.
            </h2>
            <p className="text-slate-500 text-lg">The missing platform layer for OpenClaw agencies.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {PRODUCT_CARDS.map((c) => (
              <div key={c.title} className="border border-slate-200 rounded-2xl p-6">
                <div className="text-3xl mb-3">{c.icon}</div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{c.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Business model ───────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Business model</h2>
            <p className="text-slate-500 text-lg">Simple, flat-rate plans. Agencies keep all the margin above our fee.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 ${plan.highlight
                  ? 'bg-indigo-600 text-white border-2 border-indigo-600'
                  : 'bg-white border border-slate-200 text-slate-900'
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${plan.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm font-medium mb-4 ${plan.highlight ? 'text-indigo-100' : 'text-slate-600'}`}>{plan.clients}</p>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? 'text-indigo-100' : 'text-slate-600'}`}>
                      <span className={plan.highlight ? 'text-indigo-300' : 'text-green-500'}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why demo slot ────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-6">
            Why we want 5 minutes on March 16
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed mb-6">
            Jason's audience is our customer. The TWIST community, Clawhub, the OpenClaw Discord — these are GHL agency owners who understand the underlying technology and are actively looking for the platform layer to scale it.
          </p>
          <p className="text-slate-500 text-lg leading-relaxed">
            One demo at Launch reaches exactly the right people. We don't need a broad audience — we need a concentrated one. This is that moment.
          </p>
        </div>
      </section>

      {/* ── Founder ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4">
            A
          </div>
          <h3 className="text-xl font-bold text-slate-900">Angel Castro</h3>
          <p className="text-slate-500 text-sm mt-1">Founder, Conversion System</p>
          <a
            href="mailto:angel@conversionsystem.com"
            className="text-indigo-600 font-medium text-sm mt-2 inline-block hover:text-indigo-700 transition"
          >
            angel@conversionsystem.com
          </a>
        </div>
      </section>

      {/* ── CTAs ─────────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black mb-4">See it for yourself.</h2>
          <p className="text-slate-500 mb-8">Watch a live 5-minute demo or reach out directly.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo/dental"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-lg px-8 py-4 rounded-xl"
            >
              Watch live demo →
            </Link>
            <a
              href="mailto:angel@conversionsystem.com"
              className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 transition text-slate-900 font-semibold text-lg px-8 py-4 rounded-xl"
            >
              angel@conversionsystem.com
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200 py-6 text-center">
        <p className="text-slate-400 text-sm">
          Kyra by Conversion System · Powered by OpenClaw · <a href="mailto:angel@conversionsystem.com" className="hover:text-slate-600 transition">angel@conversionsystem.com</a>
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
