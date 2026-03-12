'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Check, BadgePercent } from 'lucide-react';
import { pixel } from '@/components/analytics/MetaPixel';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

const PLANS = [
  {
    name: 'Solo Pro',
    monthly: 39, annual: 29,
    annualSave: 120,
    period: '/month',
    desc: 'Your personal AI worker. Handles leads, books appointments, chats with customers 24/7.',
    cta: 'Start Solo Pro',
    href: '/solo?plan=solo_pro',
    featured: false,
    badge: 'FOR SOLO BUSINESSES',
    features: [
      '1 AI Worker powered by OpenClaw',
      '2,000 credits / month',
      'Messaging across SMS, Telegram & web chat',
      'Built-in CRM with contacts, deals & pipeline',
      'AI Templates — pick one, deploy instantly',
      'Skills — add capabilities to your AI worker',
      'Knowledge Base — teach your AI with docs & links',
      'Customer Intelligence — insights from conversations',
      'Email support',
      'Referral program — earn credits for every referral',
    ],
    limits: [],
  },
  {
    name: 'Lite',
    monthly: 99, annual: 79,
    annualSave: 240,
    period: '/month',
    desc: 'Launch your AI agency with your first 3 client AI workers.',
    cta: 'Start Lite',
    href: '/signup/agency?plan=starter',
    featured: false,
    badge: 'Start here',
    features: [
      '3 client AI workers',
      '500 platform credits / month',
      '21 industry templates',
      'Telegram, SMS, web chat',
      'CRM integration',
      'AI Sales Pipeline',
      'Smart escalation alerts',
      'Weekly performance reports',
    ],
    limits: [],
  },
  {
    name: 'Pro',
    monthly: 249, annual: 199,
    annualSave: 600,
    period: '/month',
    desc: 'Full AI workforce — up to 10 autonomous workers.',
    cta: 'Start Pro',
    href: '/signup/agency?plan=pro',
    featured: true,
    badge: '🔥 Best for growing agencies',
    features: [
      '10 client AI workers',
      '1,500 platform credits / month',
      'Everything in Lite',
      'White-label branding',
      'Custom AI personalities',
      'Review queue (human-in-the-loop)',
      'Revenue tracking dashboard',
      'Priority support',
    ],
    limits: [],
  },
  {
    name: 'Scale',
    monthly: 499, annual: 399,
    annualSave: 1200,
    period: '/month',
    desc: 'Built for high-volume agencies — 30 AI worker deployments.',
    cta: 'Start Scale',
    href: '/signup/agency?plan=scale',
    featured: false,
    badge: 'For high-volume agencies',
    features: [
      '30 client AI workers',
      '2,500 platform credits / month',
      'Everything in Pro',
      'AI Sales Pipeline (unlimited + priority)',
      'Dedicated infrastructure',
      'Outbound webhooks',
      'Alert monitoring',
      'Dedicated Slack support',
      'API access',
    ],
    limits: [],
  },
];

const FAQ = [
  {
    q: 'Do I need any specific CRM to use Kyra?',
    a: 'GHL is required for SMS and multi-channel features. Kyra\'s web chat widget works on any website without GHL. Most agency use cases need GHL for the full feature set.',
  },
  {
    q: 'What does "AI worker" mean exactly?',
    a: 'Each AI worker is an isolated AI agent with its own personality, memory, and channels — configured for one client business. It responds to their leads, books appointments, updates their CRM, and escalates to humans when needed.',
  },
  {
    q: 'How do agencies make money with Kyra?',
    a: 'Agencies charge clients $500–$2,000/month per AI worker. At Pro ($249/mo, 15 clients), billing $997/client = $14,955/mo revenue — $14,706/mo gross margin. Most agencies start at $497–$997/mo per client.',
  },
  {
    q: 'What is BYOK (Bring Your Own Key)?',
    a: 'On Lite+ plans, connect your own OpenAI or Anthropic API key. Full control over AI costs and model selection. On Free, Kyra\'s shared key is used.',
  },
  {
    q: 'Is there a long-term contract?',
    a: 'Monthly plans cancel anytime. Annual plans are billed upfront for the year and save 20%. 7-day free trial on all paid plans.',
  },
  {
    q: 'What happens if my client count exceeds my plan?',
    a: 'You\'ll see a prompt to upgrade before adding more clients. Existing clients are never interrupted.',
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    pixel.viewContent('Pricing Page');
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <PublicNav />

      {/* Header */}
      <section className="py-20 text-center px-4">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          Solo from $39/mo · Agency from $99/mo · 7-day free trial · Cancel anytime
        </div>
        <h1 className="text-4xl sm:text-5xl font-black mb-4">
          Pricing for agencies that mean business.
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-6">
          Every plan includes OpenClaw-powered autonomous AI workers. Not chatbots. Workers.
        </p>

      </section>

      {/* Agency Plans intro */}
      <section className="max-w-6xl mx-auto px-4 pb-4 text-center">
        <p className="text-slate-400 text-lg mb-10">
          You pay $99–$499/mo. You bill clients $500–$2,000/mo each. The math works from day one.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 bg-white/10 rounded-full p-1.5 border border-white/10">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-white text-gray-900 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${annual ? 'bg-white text-gray-900 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Annual
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${annual ? 'bg-green-500 text-white' : 'bg-green-800/60 text-green-300'}`}>
              Save 20%
            </span>
          </button>
        </div>
      </section>

      {/* Agency Plans */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const price = annual && plan.annual > 0 ? plan.annual : plan.monthly;
            const displayPrice = price === 0 ? '$0' : `$${price}`;
            const hrefWithBilling = annual && plan.annual > 0
              ? plan.href + (plan.href.includes('?') ? '&billing=annual' : '?billing=annual')
              : plan.href;

            return (
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
                      <span className="text-3xl font-black">{displayPrice}</span>
                      <span className="text-slate-400 text-sm">{price === 0 ? plan.period : '/month'}</span>
                    </div>
                    {annual && plan.annualSave && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <BadgePercent className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-xs text-green-400 font-semibold">
                          Save ${plan.annualSave}/year · billed annually
                        </span>
                      </div>
                    )}
                    {!annual && plan.annualSave && (
                      <p className="text-xs text-slate-600 mt-1.5">
                        Switch to annual → save ${plan.annualSave}/year
                      </p>
                    )}
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
                    href={hrefWithBilling}
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
            );
          })}
        </div>

        {/* Voice Add-on */}
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-emerald-400 text-sm uppercase tracking-wide">📞 Voice AI Add-on</span>
                <span className="text-xs bg-emerald-800/50 text-emerald-300 px-2 py-0.5 rounded-full">Works on any plan</span>
              </div>
              <p className="text-2xl font-black text-white">$79<span className="text-slate-400 text-base font-normal">/mo</span>
                <span className="text-sm text-slate-400 font-normal ml-2">or $63/mo billed annually</span>
              </p>
              <p className="text-slate-400 text-sm mt-1">300 AI calling minutes · inbound + outbound · transcripts · auto-escalation to human</p>
            </div>
            <a
              href="/solo?addon=voice"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl transition text-sm whitespace-nowrap"
            >
              Add Voice AI →
            </a>
          </div>
        </div>

        {/* OpenClaw math callout */}
        <div className="mt-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/40 p-5 text-center">
          <p className="text-indigo-200 text-sm font-semibold">
            💡 Platform credits are included — no API keys needed to start. Solo Pro: 2,000 credits/mo · Lite: 500 · Pro: 1,500 · Scale: 2,500. Bring your own key (BYOK) for Lite+.
          </p>
        </div>

        {/* Annual savings summary bar */}
        {annual && (
          <div className="mt-6 rounded-2xl border border-green-800/40 bg-green-950/30 p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BadgePercent className="h-6 w-6 text-green-400" />
              <div>
                <p className="font-bold text-white">Annual billing saves you real money</p>
                <p className="text-sm text-green-300/70">Pro plan: save $600/yr · Scale: save $1,200/yr</p>
              </div>
            </div>
            <span className="text-xs text-green-400 border border-green-700 rounded-full px-3 py-1">
              Billed as one annual payment
            </span>
          </div>
        )}

        {/* ROI callout */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 text-center">
          <p className="text-slate-400 text-sm mb-1">At Pro plan {annual ? '($199/mo annual)' : '($249/mo)'} with just 5 clients billed at $997/mo each:</p>
          <p className="text-2xl font-black text-green-400">
            $4,985/mo revenue · ${annual ? '4,786' : '4,736'}/mo gross margin
          </p>
          <p className="text-slate-500 text-xs mt-1">Before API key costs (typically $0.50–$2/client/mo)</p>
        </div>
      </section>

      {/* Belief Shifts / Objection Handling */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-black text-center mb-3">Still on the fence?</h2>
        <p className="text-slate-400 text-sm text-center mb-10">Every objection you have — we&apos;ve heard it. Here&apos;s the truth.</p>
        <div className="space-y-4">
          {[
            {
              old: '"I need to be technical to run AI agents."',
              truth: 'You need to be a clear thinker, not a developer. Kyra has zero terminal commands. Pick a template, customize, deploy. The hardest part is deciding what your AI should say — and we give you templates for that too.',
            },
            {
              old: '"AI is just for big companies with engineering teams."',
              truth: 'That was true 12 months ago. Today a solo plumber in Ohio can deploy an AI receptionist that answers calls, books jobs, and follows up — for less than the cost of one lunch per day.',
            },
            {
              old: '"I don\'t have time to set this up."',
              truth: 'Kyra\'s Setup Wizard takes 5 minutes. Not 5 hours. Not 30 days. Five minutes. Then it runs 24/7 without you touching it. The setup IS the time saving.',
            },
            {
              old: '"I tried AI tools before and they didn\'t work."',
              truth: 'You were using AI like a search engine — ask a question, get an answer, done. Kyra gives AI a role, a personality, memory of past conversations, and real tools (booking, CRM, SMS). Completely different experience.',
            },
            {
              old: '"My business is too unique for AI."',
              truth: 'Every business answers phones, qualifies leads, books appointments, follows up, and asks for reviews. If you do any of those manually, Kyra can do them autonomously.',
            },
            {
              old: '"I don\'t want to lose control."',
              truth: 'Kyra has Review Gates — AI drafts a response, you approve it before it sends. Plus alert rules, conversation logs, and a full analytics dashboard. You have MORE visibility than you had before.',
            },
          ].map((item, i) => (
            <div key={i} className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
              <p className="text-red-400 text-sm font-semibold line-through opacity-70 mb-2">{item.old}</p>
              <p className="text-slate-300 text-sm leading-relaxed">{item.truth}</p>
            </div>
          ))}
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
        <h2 className="text-3xl sm:text-4xl font-black mb-4">Ready to deploy your first AI worker?</h2>
        <p className="text-slate-400 mb-8">Start on Lite at $99/mo. 7-day free trial — no charge today.</p>
        <Link
          href="/solo"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg px-8 py-4 rounded-xl transition"
        >
          Start free →
        </Link>
        <p className="text-slate-600 text-sm mt-4">Cancel anytime · Upgrade as you grow · 500 credits included</p>
      </section>

      <PublicFooter />
    </div>
  );
}
