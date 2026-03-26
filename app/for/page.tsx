// Personalized outreach landing page
// URL: /for?name=Marcus&agency=Apex+Digital&niche=dental
// Used for cold outreach to agency owners — personalized by name+niche

import Link from 'next/link';
import type { Metadata } from 'next';

import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
export const metadata: Metadata = {
  title: 'Kyra — AI Workforce Platform for Agency Clients',
  description:
    'Kyra adds an autonomous AI worker to any client account. Responds in 60 seconds, books appointments, updates CRM. Free to start.',
};

const NICHE_DATA: Record<string, {
  emoji: string;
  label: string;
  pain: string;
  result: string;
  demoStat: string;
  demoSlug: string;
  callout: string;
}> = {
  dental: {
    emoji: '🦷', label: 'dental',
    pain: 'Dental clients miss appointment requests that come in after hours. Every unanswered text is a lost patient.',
    result: 'Dental agencies using Kyra see 40%+ more booked appointments — without adding a single staff hour.',
    demoStat: '+40% appointment bookings',
    demoSlug: 'dental',
    callout: 'The dental AI replies to "how much is a cleaning?" in under 60 seconds — checks insurance, offers slots, confirms the booking.',
  },
  realestate: {
    emoji: '🏡', label: 'real estate',
    pain: 'Real estate leads go cold in under 5 minutes. Agents can\'t respond fast enough — especially nights and weekends.',
    result: 'Every new lead gets an immediate AI follow-up. No more lost deals because no one picked up the phone.',
    demoStat: '100% of leads contacted in <5 min',
    demoSlug: 'realestate',
    callout: 'The real estate AI qualifies every lead, books showings, and keeps warm leads engaged until an agent is ready.',
  },
  cannabis: {
    emoji: '🌿', label: 'cannabis',
    pain: 'Cannabis dispensaries get flooded with product, pricing, and pickup questions — especially on weekends.',
    result:
      "We've used AI SMS to drive significant revenue for cannabis clients in previous deployments. The AI handles every inquiry, recommends products, and stays compliant.",
    demoStat: 'Proven on high-volume cannabis SMS',
    demoSlug: 'cannabis',
    callout:
      'The cannabis AI knows every menu item, handles age verification messaging, and drives repeat visits with personalized recommendations.',
  },
  auto: {
    emoji: '🚗', label: 'auto dealership',
    pain: 'Auto leads cost $400+ each — and half go unanswered for hours. That\'s money sitting on the floor.',
    result: 'Dealers with AI SMS close 30% more because every lead gets a human-feeling response in under 60 seconds.',
    demoStat: '30% more leads converted',
    demoSlug: 'auto',
    callout: 'The auto AI answers vehicle questions, books test drives, and pre-qualifies buyers before the sales team gets involved.',
  },
  medspa: {
    emoji: '💆', label: 'med spa',
    pain: 'Med spa inquiries peak in evenings and on weekends — exactly when staff aren\'t available to respond.',
    result: 'Consultation bookings happen 24/7. The AI answers treatment questions, quotes pricing, and captures deposits automatically.',
    demoStat: '24/7 consultation booking',
    demoSlug: 'medspa',
    callout: 'The med spa AI handles "how much is Botox?" with personalized responses, books free consultations, and upsells packages naturally.',
  },
  insurance: {
    emoji: '📋', label: 'insurance',
    pain: 'Insurance leads that don\'t get a quote response in 5 minutes are 80% less likely to close.',
    result: 'The AI pre-qualifies every inbound inquiry, delivers quotes instantly, and schedules agent calls for hot leads.',
    demoStat: '3× more leads converted to calls',
    demoSlug: 'dental',
    callout: 'The insurance AI collects coverage needs, explains policy options, and hands off only qualified prospects to your agents.',
  },
  homeservices: {
    emoji: '🔧', label: 'home services',
    pain: 'HVAC, roofing, and plumbing clients miss urgent calls — especially nights and emergency situations.',
    result: 'The AI is on 24/7. Emergency or routine, every inbound text gets an immediate, helpful response.',
    demoStat: '0 missed service calls',
    demoSlug: 'dental',
    callout: 'The home services AI triages urgency, dispatches emergency contacts for urgent jobs, and books standard service appointments automatically.',
  },
  fitness: {
    emoji: '💪', label: 'fitness',
    pain: 'Gym leads who don\'t hear back in 10 minutes cancel 80% of the time. Every missed text is a lost member.',
    result: 'The AI captures every trial sign-up inquiry and books them into an orientation class before they lose interest.',
    demoStat: '80% fewer lost leads',
    demoSlug: 'dental',
    callout: 'The fitness AI offers free trials, books orientation sessions, and follows up with non-starters automatically.',
  },
};

const DEFAULT_NICHE = NICHE_DATA.dental;

interface Props {
  searchParams: Promise<{ name?: string; agency?: string; niche?: string; ref?: string }>;
}

export default async function ForPage({ searchParams }: Props) {
  const params = await searchParams;
  const name = params.name || '';
  const agency = params.agency || '';
  const rawNiche = (params.niche || 'dental').toLowerCase().replace(/\s+/g, '');
  const niche = NICHE_DATA[rawNiche] ?? DEFAULT_NICHE;
  const firstName = name.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PublicNav />

      {/* Personalized header bar */}
      <div className="bg-indigo-900 text-white px-4 py-3 text-center text-sm">
        <span className="text-indigo-300">This page was made for </span>
        <strong>{agency || 'your agency'}</strong>
        <span className="text-indigo-300"> — specifically for your {niche.label} clients.</span>
      </div>

      {/* Nav */}
      <nav className="border-b border-gray-100 px-4 py-4 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xl">
            <span className="text-indigo-600">⚡</span> Kyra
          </div>
          <Link href="/solo" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">
            Start Free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            {/* Personalized greeting */}
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
              {niche.emoji} Built for {niche.label} agencies
            </div>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-6">
              {name ? `Hi ${firstName} —` : 'Hey —'}<br />
              your {niche.emoji} clients<br />
              need an <span className="text-indigo-600">AI worker.</span>
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-8">
              {niche.pain}
            </p>
            <p className="text-lg text-gray-900 font-medium mb-8 leading-relaxed">
              {niche.result}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/solo${params.ref ? `?ref=${params.ref}` : ''}`}
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-8 py-4 rounded-xl transition text-center"
              >
                Start Free — No Credit Card Required
              </Link>
              <Link
                href={`/try/${niche.demoSlug}`}
                className="inline-block border-2 border-gray-200 hover:border-indigo-300 text-gray-700 font-semibold text-lg px-6 py-4 rounded-xl transition text-center"
              >
                {niche.emoji} See {niche.label} demo →
              </Link>
            </div>
            <p className="text-gray-400 text-sm mt-4">No credit card · Setup in under 10 minutes</p>
          </div>

          {/* Stat card */}
          <div className="space-y-4">
            <div className="bg-indigo-900 text-white rounded-2xl p-8 text-center">
              <p className="text-sm text-indigo-300 mb-2">Proven result for {niche.label} agencies</p>
              <p className="text-5xl font-black text-white mb-2">{niche.demoStat}</p>
              <p className="text-indigo-300 text-sm">powered by Kyra AI</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-3">How it works for {niche.label} clients:</p>
              <p className="text-sm text-gray-600 leading-relaxed">{niche.callout}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { v: '< 60s', l: 'Response time' },
                { v: '24/7', l: 'Always on' },
                { v: '10 min', l: 'Setup time' },
              ].map(s => (
                <div key={s.l} className="border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-indigo-600">{s.v}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">
            Add an AI worker to{agency ? ` ${agency}'s` : ' your'} {niche.label} clients in 3 steps
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Add a client', desc: 'Enter the client\'s business name and pick an industry template. Takes 2 minutes.' },
              { step: '02', title: `Pick ${niche.emoji} template`, desc: `Choose the ${niche.label} template. Customize the AI name, services, and tone.` },
              { step: '03', title: 'Go live', desc: 'The AI starts responding to every inbound message immediately. You\'re done.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 font-black text-2xl flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agency revenue math */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-4">
            {agency ? `${agency}'s` : 'Your'} revenue with Kyra
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Most agencies charge $500–$1,500/month per AI worker — white-labeled as their own service.
          </p>
          <div className="border-2 border-indigo-200 rounded-2xl overflow-hidden">
            <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
              <p className="text-sm font-bold text-indigo-800">Revenue model — Pro Plan ($299/mo)</p>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: '10 clients × $997/mo', value: '$9,970/mo', positive: true },
                { label: 'Kyra Pro plan cost', value: '- $299/mo', positive: false },
                { label: 'AI API costs (est.)', value: '- $20/mo', positive: false },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-600">{r.label}</span>
                  <span className={`font-bold ${r.positive ? 'text-gray-900' : 'text-red-500'}`}>{r.value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 mt-2">
                <span className="font-bold text-gray-900">Monthly margin</span>
                <span className="text-2xl font-black text-green-600">$9,651/mo</span>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Billing rates vary. Results depend on client count and pricing.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-10">Agencies using Kyra</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                quote: "I added it to my dental client on a Friday. By Monday, 3 appointments were booked while the office was closed. That's the whole pitch right there.",
                ctx: '🦷 Dental agency owner',
              },
              {
                quote: "My clients don't ask how it works. They see the conversation log, they see the bookings, they pay. That's all that matters.",
                ctx: '🏡 Real estate + auto agency',
              },
              {
                quote: "White-labeled it as our own AI product. Now it's our highest-margin offering. Clients pay $997/mo, we pay $299 total for 10 of them.",
                ctx: '💰 Agency owner',
              },
              {
                quote: "Cannabis clients get dozens of 'what's your menu?' texts every day. The AI handles every single one, 24/7. Our client can't imagine not having it.",
                ctx: '🌿 Cannabis agency',
              },
            ].map(t => (
              <div key={t.ctx} className="bg-white rounded-xl p-5 border border-gray-200">
                <p className="text-gray-700 italic text-sm leading-relaxed mb-3">"{t.quote}"</p>
                <p className="text-xs text-indigo-600 font-semibold">{t.ctx}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-indigo-900 text-white py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          {name && (
            <p className="text-indigo-300 text-lg mb-4">
              {firstName}, your {niche.label} clients are waiting.
            </p>
          )}
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Start free. Deploy in 10 minutes.
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            50 welcome credits included — start testing with a real client immediately.
          </p>
          <Link
            href={`/solo${params.ref ? `?ref=${params.ref}` : ''}`}
            className="inline-block bg-white text-indigo-900 font-black text-xl px-10 py-5 rounded-xl hover:bg-indigo-50 transition"
          >
            Get Started Free →
          </Link>
          <p className="text-indigo-400 text-sm mt-4">No credit card · 10-minute setup · Cancel anytime</p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
