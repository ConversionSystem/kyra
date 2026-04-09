import type { Metadata } from 'next';
import Link from 'next/link';
import { PartnerApplicationForm } from './partner-form';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Become a Kyra Agency Partner — Earn Recurring Revenue',
  description:
    'Refer agencies to Kyra. Earn 100 credits for every agency that signs up + stays. Get early access, partner badges, and more.',
};

const STEPS = [
  {
    step: '1',
    title: 'Get your unique referral link',
    desc: 'Sign up or log in, then grab your personal referral link from the dashboard.',
  },
  {
    step: '2',
    title: 'Share with other GHL agencies',
    desc: 'Send it via DM, email, or social. We give you ready-made templates that convert.',
  },
  {
    step: '3',
    title: 'Earn 100 credits per referral',
    desc: 'When an agency signs up through your link and stays active, you earn 100 AI credits (worth $10).',
  },
];

const PERKS = [
  {
    icon: '🎁',
    title: '100 credits per referral',
    desc: 'Worth $10 in AI usage. Credits added automatically. Your referrals get access to all 15+ intelligence features — memory graph, lead scoring, deal autopilot, and more.',
  },
  {
    icon: '🚀',
    title: 'Early access to new features',
    desc: 'Partners get first look at new AI workers, integrations, and platform updates.',
  },
  {
    icon: '🏅',
    title: 'Partner badge in the community',
    desc: 'Stand out with a verified partner badge. Show your network you\'re a trusted voice.',
  },
  {
    icon: '📋',
    title: 'Featured in Kyra directory',
    desc: 'Coming soon — top partners will be listed in our public agency directory.',
  },
];

const TIERS = [
  {
    name: 'Starter',
    referrals: '1–5 active referrals',
    commission: '100 credits',
    color: 'border-gray-200',
    badge: null,
    perks: ['100 credits per active referral/month', 'Kyra co-branded pitch deck', 'Priority support'],
  },
  {
    name: 'Growth',
    referrals: '6–20 active referrals',
    commission: '150 credits',
    color: 'border-indigo-400',
    badge: 'Most popular',
    perks: ['Everything in Starter', '150 credits per active referral/month', 'Case study co-creation opportunity', 'Dedicated partner Slack channel'],
  },
  {
    name: 'Elite',
    referrals: '21+ active referrals',
    commission: '200 credits',
    color: 'border-amber-400',
    badge: 'Elite',
    perks: ['Everything in Growth', '200 credits per active referral/month', 'Featured on kyra.conversionsystem.com', 'Direct line to product team', 'Custom integrations on request'],
  },
];

export default function PartnersPage() {
  return (
    <div className="bg-white min-h-screen text-gray-900 font-sans">
      <PublicNav />

      {/* ── Hero ── */}
      <section className="bg-slate-900 text-white px-4 py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
            Become a Kyra{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Agency Partner
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-xl mx-auto mb-10 leading-relaxed">
            Refer agencies to the AI workforce platform with 72 worker roles, 50+ GHL tools, and 15+ intelligence features. Earn credits for every referral.
          </p>
          <Link
            href="/agency/referrals"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg px-10 py-4 rounded-xl transition-colors"
          >
            Get My Partner Link →
          </Link>
          <p className="text-gray-500 text-sm mt-4">Already have an account? You&apos;re already eligible.</p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-black text-xl flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Partners Get ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">What partners get</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {PERKS.map((p) => (
              <div key={p.title} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Partner Tiers ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Partner tiers</h2>
          <p className="text-center text-gray-500 mb-12">More referrals = more credits. Tiers unlock automatically.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {TIERS.map(tier => (
              <div key={tier.name} className={`border-2 ${tier.color} rounded-2xl p-6`}>
                {tier.badge && (
                  <span className="inline-block text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full mb-3">
                    {tier.badge}
                  </span>
                )}
                <h3 className="text-xl font-black text-gray-900">{tier.name}</h3>
                <p className="text-sm text-gray-500 mt-1 mb-3">{tier.referrals}</p>
                <p className="text-4xl font-black text-indigo-600 mb-4">{tier.commission}</p>
                <p className="text-xs text-gray-500 mb-5">per active referral / month</p>
                <ul className="space-y-2">
                  {tier.perks.map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 font-bold shrink-0">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Application Form ── */}
      <section id="apply" className="py-20 px-4 bg-gray-50">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Apply to become a partner</h2>
          <p className="text-center text-gray-500 mb-10">
            Free to join. Approved within 24 hours. Credits start on your first referral.
          </p>
          <PartnerApplicationForm />
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Start earning today
          </h2>
          <p className="text-indigo-200 text-lg mb-8">
            Grab your referral link and share it. It takes 30 seconds.
          </p>
          <Link
            href="/agency/referrals"
            className="inline-block bg-white text-indigo-700 font-black text-lg px-10 py-4 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Get My Partner Link →
          </Link>
          <p className="text-indigo-300 text-sm mt-4">
            Not signed up yet? <Link href="/signup" className="underline hover:text-white">Create a free account</Link> first.
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
