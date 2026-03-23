import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import { PixelEvent } from '@/components/analytics/PixelEvent';
import { TestimonialPlaceholder } from '@/components/marketing/testimonial-placeholder';

export const metadata: Metadata = {
  title: 'Kyra for GHL Agencies — AI Workers That Book, Respond & Close',
  description:
    'Deploy intelligent AI workers for your GHL clients in 5 minutes. They respond to leads, book appointments, and close deals — 24/7. Start your free 7-day trial.',
};

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI Workers That Actually Work',
    desc: 'Pre-trained for your industry. Responds to SMS, email, and chat in under 60 seconds. No rule-based chatbots — real AI conversations.',
  },
  {
    icon: '🔌',
    title: 'Deep GHL Integration',
    desc: 'Reads contacts, books appointments, moves pipeline stages. Native OAuth — no Zapier, no webhooks to configure.',
  },
  {
    icon: '💰',
    title: 'Bill Your Clients',
    desc: 'Set your own pricing. Stripe Connect built-in. Keep the margin. Your clients pay you, you pay Kyra.',
  },
];

const PRICING = [
  {
    name: 'Lite',
    price: '$99',
    period: '/mo',
    features: ['3 clients', '500 AI credits', 'GHL integration', 'Email support'],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$249',
    period: '/mo',
    features: ['10 clients', '1,500 AI credits', 'White-label branding', 'Priority support'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Scale',
    price: '$499',
    period: '/mo',
    features: ['30 clients', '2,500 AI credits', 'Everything in Pro', 'Dedicated onboarding'],
    cta: 'Start Free Trial',
    popular: false,
  },
];

const FAQS = [
  {
    q: 'Does this replace GHL Conversation AI?',
    a: "No — it supercharges it. Kyra uses Claude AI for real, nuanced conversations. Not rule-based chatbots. It works alongside GHL's native features.",
  },
  {
    q: 'Can my clients see Kyra branding?',
    a: 'No. Pro+ plans let you white-label everything — your domain, your logo, your brand. Your clients never see Kyra.',
  },
  {
    q: 'What happens after the trial?',
    a: 'You only pay if you love it. Cancel anytime, no questions asked. No credit card required to start.',
  },
  {
    q: 'Do my clients need a GHL account?',
    a: 'Yes — Kyra plugs into an existing GHL sub-account. Each client needs their own sub-account for the AI worker to operate in.',
  },
  {
    q: 'How fast does the AI respond?',
    a: 'Under 60 seconds. Usually 5-15 seconds. Fast enough that leads think they\'re talking to a real person.',
  },
];

export default function GhlMarketplacePage() {
  return (
    <div className="bg-white text-gray-900 min-h-screen font-sans">
      <PixelEvent event="ViewContent" params={{ content_name: 'GHL Marketplace Page', content_category: 'Landing Page' }} />
      <PublicNav />

      {/* ── Hero ── */}
      <section className="bg-slate-900 text-white px-4 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <span className="text-green-400 text-xs font-bold">●</span>
            Official GoHighLevel Integration
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6">
            Turn Your GHL Agency Into an{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AI Powerhouse
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Deploy intelligent AI workers for your clients in 5 minutes. They respond to leads,
            book appointments, and close deals — 24/7.
          </p>
          <Link
            href="/signup/agency"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors"
          >
            Start Free 7-Day Trial →
          </Link>
          <p className="text-gray-500 text-sm mt-4">No credit card required</p>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="border-b border-gray-100 py-8 bg-gray-50">
        <p className="text-center text-sm text-gray-500 font-medium">
          Join <span className="text-gray-900 font-bold">50+ agencies</span> already running AI workers on Kyra
        </p>
      </section>

      {/* ── Feature Grid ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Everything your agency needs</h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
            One platform to deploy, manage, and bill AI workers for every client.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="text-center">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Simple, predictable pricing</h2>
          <p className="text-center text-gray-500 mb-12">
            Start with a 7-day free trial, no credit card required.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 bg-white border-2 ${
                  plan.popular ? 'border-indigo-500 shadow-lg relative' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500 font-bold">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup/agency"
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                    plan.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <TestimonialPlaceholder />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Common questions</h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q} className="border-b border-gray-200 pb-6">
                <p className="font-bold text-gray-900 mb-2">{faq.q}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Ready to add AI workers to your agency?
          </h2>
          <p className="text-indigo-200 text-lg mb-8">
            Deploy your first AI worker in 5 minutes. Free for 7 days.
          </p>
          <Link
            href="/signup/agency"
            className="inline-block bg-white text-indigo-700 font-black text-lg px-10 py-4 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Start Free 7-Day Trial →
          </Link>
          <p className="text-indigo-300 text-sm mt-4">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
