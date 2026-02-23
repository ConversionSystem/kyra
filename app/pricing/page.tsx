import Link from 'next/link';
import { Check, Zap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Kyra AI Employee Platform',
  description: 'Deploy AI employees for your GHL agency clients. Free to start, paid plans from $99/mo. No credit card required.',
};

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Try Kyra with one real client. No credit card.',
    cta: 'Get Started Free',
    href: '/signup/agency',
    featured: false,
    badge: null,
    features: [
      '1 AI employee',
      'GHL SMS integration',
      'All industry templates',
      'Personality customization',
      'Web chat widget',
      'Basic analytics',
    ],
    limits: [
      'No weekly reports',
      'No API key management',
    ],
  },
  {
    name: 'Lite',
    price: '$99',
    period: '/month',
    desc: 'For agencies adding AI to their first 5 clients.',
    cta: 'Start 30-Day Trial',
    href: '/signup/agency?plan=starter',
    featured: false,
    badge: 'Most popular for new agencies',
    features: [
      '5 AI employees',
      'Everything in Free',
      'Bring your own OpenAI key (BYOK)',
      'Weekly performance reports',
      'Priority support',
      'Pitch page generator',
    ],
    limits: [],
  },
  {
    name: 'Pro',
    price: '$249',
    period: '/month',
    desc: 'When you\'re selling AI employees as a core offer.',
    cta: 'Start 30-Day Trial',
    href: '/signup/agency?plan=pro',
    featured: true,
    badge: '🔥 Best for growing agencies',
    features: [
      '15 AI employees',
      'Everything in Lite',
      'White-label branding',
      'Business-in-a-Box playbook',
      'Referral program',
      'Advanced analytics',
    ],
    limits: [],
  },
  {
    name: 'Scale',
    price: '$499',
    period: '/month',
    desc: 'Full agency operation — 50 clients, maximum output.',
    cta: 'Start 30-Day Trial',
    href: '/signup/agency?plan=scale',
    featured: false,
    badge: 'For high-volume agencies',
    features: [
      '50 AI employees',
      'Everything in Pro',
      'Dedicated infrastructure per client',
      'Admin MRR dashboard',
      'Custom onboarding support',
      'Slack / email priority support',
    ],
    limits: [],
  },
];

const FAQ = [
  {
    q: 'Do I need GoHighLevel to use Kyra?',
    a: 'GHL is required for SMS and multi-channel features (WhatsApp, Instagram DMs, Facebook, etc.). Kyra\'s web chat widget works on any website without GHL. Most agency use cases need GHL for the full feature set.',
  },
  {
    q: 'What does "AI employee" mean exactly?',
    a: 'Each AI employee is an isolated AI agent with its own personality, memory, and channels — configured for one client business. It responds to their leads, books appointments, updates their CRM, and escalates to humans when needed. It\'s not a chatbot template — it\'s a fully autonomous agent.',
  },
  {
    q: 'How do agencies make money with Kyra?',
    a: 'Agencies charge clients $500–$2,000/month per AI employee (as a retainer or add-on). At the Pro plan ($249/mo, 15 clients), even billing $500/client generates $7,500/mo with $7,251/mo margin. Most agencies charge $997–$1,497/mo per client.',
  },
  {
    q: 'What is BYOK (Bring Your Own Key)?',
    a: 'On Lite+ plans, you can connect your own OpenAI API key. This gives you full control over AI costs and model selection. On the Free plan, Kyra\'s default key is used (GPT-4o mini).',
  },
  {
    q: 'Is there a long-term contract?',
    a: 'No. Monthly billing, cancel anytime. 30-day free trial on all paid plans — no credit card required to start.',
  },
  {
    q: 'What happens if my client count exceeds my plan?',
    a: 'You\'ll see a prompt to upgrade before you can add more clients. Existing clients are never interrupted.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-xl">
            <Zap className="h-5 w-5 text-indigo-400" />
            Kyra
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <Link href="/demo/dental" className="hover:text-white transition">Demo</Link>
            <Link href="/login" className="hover:text-white transition">Log in</Link>
            <Link href="/signup/agency" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold transition text-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-20 text-center px-4">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          30-day free trial · No credit card required
        </div>
        <h1 className="text-4xl sm:text-5xl font-black mb-4">
          Simple pricing.<br />
          <span className="text-indigo-400">Massive ROI.</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          You pay $99–$499/mo. You bill clients $500–$2,000/mo each. The math works from day one.
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border flex flex-col ${
                plan.featured
                  ? 'border-indigo-500 bg-indigo-950/50'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {plan.badge && (
                <div className={`text-xs font-semibold px-3 py-1.5 rounded-t-2xl text-center ${
                  plan.featured ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-300'
                }`}>
                  {plan.badge}
                </div>
              )}
              <div className="p-6 flex flex-col flex-1">
                <div className="mb-4">
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black">{plan.price}</span>
                    <span className="text-slate-400 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">{plan.desc}</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.limits.map((l) => (
                    <li key={l} className="flex items-start gap-2 text-sm text-slate-500">
                      <span className="text-slate-600 shrink-0 mt-0.5">—</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block text-center py-3 px-4 rounded-xl font-bold text-sm transition ${
                    plan.featured
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-white/10 hover:bg-white/15 border border-white/10 text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* ROI callout */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 text-center">
          <p className="text-slate-400 text-sm mb-1">At Pro plan ($249/mo) with 10 clients billed at $997/mo each:</p>
          <p className="text-2xl font-black text-green-400">$9,970/mo agency revenue · $9,721/mo gross margin</p>
          <p className="text-slate-500 text-xs mt-1">Before your API key costs (typically $0.50–$2/client/mo at moderate volume)</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-24">
        <h2 className="text-2xl font-black text-center mb-10">Frequently asked questions</h2>
        <div className="space-y-6">
          {FAQ.map((item) => (
            <div key={item.q} className="border-b border-white/10 pb-6">
              <h3 className="font-bold text-white mb-2">{item.q}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-20 text-center px-4">
        <h2 className="text-3xl sm:text-4xl font-black mb-4">Ready to deploy your first AI employee?</h2>
        <p className="text-slate-400 mb-8">Free to start. Works with your existing GoHighLevel account.</p>
        <Link
          href="/signup/agency"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg px-8 py-4 rounded-xl transition"
        >
          Get Started Free →
        </Link>
        <p className="text-slate-600 text-sm mt-4">No credit card · 30-day trial on paid plans · Cancel anytime</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-slate-600 text-sm px-4">
        <p>© 2026 Conversion System · <Link href="/privacy" className="hover:text-slate-400">Privacy</Link> · <Link href="/terms" className="hover:text-slate-400">Terms</Link></p>
      </footer>
    </div>
  );
}
