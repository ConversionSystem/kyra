import type { Metadata } from 'next';
import Link from 'next/link';
import { PartnerApplicationForm } from './partner-form';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra Partner Program — Resell Autonomous AI Workers',
  description: 'Join the Kyra Partner Program. Refer GHL agencies and earn 20% monthly recurring revenue for the lifetime of each account. No cap, no expiry.',
};

const TIERS = [
  {
    name: 'Starter',
    referrals: '1–5 active referrals',
    commission: '20%',
    color: 'border-gray-200',
    badge: null,
    perks: ['Monthly recurring commission', 'Kyra co-branded pitch deck', 'Priority support'],
  },
  {
    name: 'Growth',
    referrals: '6–20 active referrals',
    commission: '22%',
    color: 'border-indigo-400',
    badge: '🚀 Most popular',
    perks: ['Everything in Starter', 'Case study co-creation opportunity', 'Joint LinkedIn content', 'Dedicated partner Slack channel'],
  },
  {
    name: 'Elite',
    referrals: '21+ active referrals',
    commission: '25%',
    color: 'border-amber-400',
    badge: '⭐ Elite',
    perks: ['Everything in Growth', 'Revenue share bump to 25%', 'Featured on kyra.conversionsystem.com', 'Direct line to product team', 'Custom integrations on request'],
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Apply below',
    desc: 'Fill out the short application. We review and approve within 24 hours.',
  },
  {
    step: '02',
    title: 'Get your partner link',
    desc: 'You\'ll receive a unique tracking link and co-branded pitch materials to share with agency owners.',
  },
  {
    step: '03',
    title: 'Refer agencies',
    desc: 'Send your link to GHL agency owners. When they sign up and pay, you earn 20% every month they stay.',
  },
  {
    step: '04',
    title: 'Get paid monthly',
    desc: 'Commission is paid on the 1st of each month via Stripe. No minimum payout threshold.',
  },
];

const EARNINGS = [
  { referrals: 5, plan: 'Lite', monthly: 99, commission: 20, label: '5 agencies on Lite' },
  { referrals: 10, plan: 'Pro', monthly: 249, commission: 20, label: '10 agencies on Pro' },
  { referrals: 20, plan: 'Pro', monthly: 249, commission: 22, label: '20 agencies on Pro (Growth tier)' },
  { referrals: 30, plan: 'Scale', monthly: 499, commission: 25, label: '30 agencies on Scale (Elite tier)' },
];

export default function PartnersPage() {
  return (
    <div className="bg-white min-h-screen text-gray-900 font-sans">

      <PublicNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            💰 No cap · No expiry · Monthly payouts
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-5 leading-tight">
            Earn 20% monthly<br />
            <span className="text-indigo-300">for every agency you refer.</span>
          </h1>
          <p className="text-xl text-indigo-200 max-w-2xl mx-auto mb-10 leading-relaxed">
            Kyra Partner Program. Refer GHL agency owners. Earn recurring monthly commission as long as they stay — forever.
          </p>
          <a href="#apply" className="inline-block bg-white text-indigo-900 font-black text-lg px-8 py-4 rounded-xl hover:bg-indigo-50 transition">
            Apply Now — Free
          </a>
          <p className="text-indigo-400 text-sm mt-4">Approved within 24 hours · Payouts via Stripe</p>
        </div>
      </section>

      {/* Earnings calculator */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">What you can earn</h2>
          <p className="text-center text-gray-500 mb-12">Monthly recurring revenue, paid on the 1st of every month.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {EARNINGS.map(e => {
              const monthly = Math.round(e.referrals * e.monthly * (e.commission / 100));
              return (
                <div key={e.label} className="border-2 border-gray-200 hover:border-indigo-300 rounded-2xl p-5 text-center transition-colors">
                  <p className="text-sm text-gray-500 mb-2 leading-snug">{e.label}</p>
                  <p className="text-4xl font-black text-green-600">${monthly.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">per month · {e.commission}% commission</p>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Commission is calculated on monthly subscription revenue. Annual plans pay commission upfront on the first month.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map(s => (
              <div key={s.step}>
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-black text-xl flex items-center justify-center mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Partner tiers</h2>
          <p className="text-center text-gray-500 mb-12">More referrals = higher commission. Tiers unlock automatically.</p>
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
                <p className="text-xs text-gray-500 mb-5">monthly recurring commission</p>
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

      {/* Who should apply */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-10">Who this is for</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '🤝', title: 'GHL Consultants', desc: 'Help agencies get the most out of GoHighLevel. Kyra is a natural upsell.' },
              { icon: '🎓', title: 'Course Creators', desc: 'Running an agency program? Kyra is a tool your students will need and thank you for.' },
              { icon: '🏢', title: 'Agency Owners', desc: 'Already using Kyra? Refer peers in your network and earn from the platform you know works.' },
              { icon: '📣', title: 'Influencers & Creators', desc: 'GHL audience on YouTube, LinkedIn, or TikTok? Recurring commissions add up fast.' },
              { icon: '🔗', title: 'Integration Partners', desc: 'Building on GHL or adjacent tools? Add Kyra to your ecosystem and earn on every referral.' },
              { icon: '🧠', title: 'AI Coaches', desc: 'Teaching businesses to use AI? Kyra is a concrete tool with proven results to point clients toward.' },
            ].map(w => (
              <div key={w.title} className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="text-3xl mb-3">{w.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{w.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="py-20 px-4">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Apply to become a partner</h2>
          <p className="text-center text-gray-500 mb-10">
            Free to join. Approved within 24 hours. Commission starts on your first referral.
          </p>
          <PartnerApplicationForm />
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
