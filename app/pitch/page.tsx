'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Zap, ExternalLink } from 'lucide-react';

import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
const SLIDES = [
  {
    id: 1,
    tag: 'The Problem',
    title: 'Your clients are losing leads every night.',
    subtitle: 'While they sleep, their phone keeps buzzing.',
    content: [
      { stat: '70%', label: 'of service business leads contact competitors if not responded to within 1 hour' },
      { stat: '$0', label: 'earned from every missed after-hours inquiry — but the lead cost was already paid' },
      { stat: '0', label: 'staff available at 11pm when a patient texts asking to book a cleaning' },
    ],
    cta: null,
    accent: 'text-red-400',
  },
  {
    id: 2,
    tag: 'The Old Solutions',
    title: "Chatbots break. Automations can't think.",
    subtitle: 'And hiring staff for 24/7 coverage costs $40K+/year per client.',
    bullets: [
      '❌ Chatbots: match keywords, fail on unexpected questions, feel robotic',
      '❌ CRM automations: follow scripts, break when customers go off-path',
      '❌ Answering services: expensive, slow, and they don\'t know the business',
      '❌ More staff: not scalable, can\'t work 24/7 at scale',
    ],
    cta: null,
    accent: 'text-red-400',
  },
  {
    id: 3,
    tag: 'The Solution',
    title: 'An AI worker that works 24/7.',
    subtitle: 'Not a bot. Not a script. A real AI agent with a personality.',
    bullets: [
      '✅ Responds to every SMS within 60 seconds — day or night',
      '✅ Books appointments, answers questions, updates the CRM',
      '✅ Escalates frustrated customers to your human team instantly',
      '✅ Works on SMS, WhatsApp, Instagram, Facebook, Live Chat, and your website',
    ],
    cta: null,
    accent: 'text-green-400',
  },
  {
    id: 4,
    tag: 'See It Live',
    title: 'Try the AI right now.',
    subtitle: "This is a real conversation — not a simulation.",
    demo: true,
    industries: [
      { emoji: '🦷', label: 'Dental', slug: 'dental' },
      { emoji: '🏡', label: 'Real Estate', slug: 'realestate' },
      { emoji: '🚗', label: 'Auto', slug: 'auto' },
      { emoji: '🌿', label: 'Cannabis', slug: 'cannabis' },
      { emoji: '🍽️', label: 'Restaurant', slug: 'restaurant' },
      { emoji: '✨', label: 'Med Spa', slug: 'medspa' },
    ],
    cta: null,
    accent: 'text-indigo-400',
  },
  {
    id: 5,
    tag: 'How It Works',
    title: 'Live in under 10 minutes.',
    subtitle: 'Works with your existing CRM — or standalone.',
    steps: [
      { n: '01', title: 'Create free account', desc: 'Sign up at kyra.conversionsystem.com — no credit card' },
      { n: '02', title: 'Connect CRM', desc: 'Paste your integration token or use standalone (2 min)' },
      { n: '03', title: 'Add a client', desc: 'Pick industry template + click ✨ Generate with AI' },
      { n: '04', title: 'Go live', desc: 'AI starts responding to every inbound message within 60 seconds' },
    ],
    cta: null,
    accent: 'text-blue-400',
  },
  {
    id: 6,
    tag: 'What It Does',
    title: 'Everything a great front desk employee does.',
    subtitle: 'Without the salary, training, or sick days.',
    bullets: [
      '💬 Responds in < 60 seconds to every message — 24/7',
      '📅 Books appointments by offering available slots',
      '🧠 Reads CRM tags, pipeline stage, and notes before every reply',
      '🏷️ Auto-tags contacts and writes CRM notes after each conversation',
      '🚨 Detects frustration and escalates to humans instantly',
      '🌐 Speaks 15 languages — Spanish, Portuguese, French, and more',
    ],
    cta: null,
    accent: 'text-purple-400',
  },
  {
    id: 7,
    tag: 'The Business Model',
    title: 'Charge $500–$2,000/month per AI worker.',
    subtitle: 'Your cost to Kyra: $99–$499/month for all of them.',
    table: [
      { plan: 'Lite', cost: '$99/mo', clients: '3 clients', revenue: '$2,991/mo', margin: '$2,892' },
      { plan: 'Pro', cost: '$249/mo', clients: '10 clients', revenue: '$9,970/mo', margin: '$9,721' },
      { plan: 'Scale', cost: '$499/mo', clients: '30 clients', revenue: '$29,910/mo', margin: '$29,411' },
    ],
    tableNote: 'Assumes $1,000/client/month billing. API costs ~$1–3/client/month.',
    cta: null,
    accent: 'text-green-400',
  },
  {
    id: 8,
    tag: 'Why Now',
    title: 'AI workers are going mainstream.',
    subtitle: 'Thousands of agencies. All about to need an AI strategy.',
    bullets: [
      '🚀 OpenClaw powers Kyra\'s AI runtime — agencies are discovering autonomous AI workers',
      '📈 AI worker demand is peaking — agencies who move now capture the market',
      '🏆 Kyra is purpose-built for agencies — the competition is generic chatbots',
      '⏱️ First-mover advantage: most agencies have no AI worker offer yet',
    ],
    cta: null,
    accent: 'text-amber-400',
  },
  {
    id: 9,
    tag: 'Why Kyra',
    title: 'The only platform built specifically for agencies.',
    subtitle: "Not a chatbot. Not a hosted terminal. An AI worker business.",
    bullets: [
      '✅ One dashboard to manage ALL client AI workers',
      '✅ Per-client isolation — each AI has separate memory and personality',
      '✅ 21 industry templates — dental, real estate, cannabis, auto, restaurant, and more',
      '✅ White-label — your agency name, your clients\'s AI worker',
      '✅ Pitch pages, referral program, Business-in-a-Box playbook included',
      '✅ CRM integrations (GoHighLevel, and more coming)',
    ],
    cta: null,
    accent: 'text-indigo-400',
  },
  {
    id: 10,
    tag: 'Get Started',
    title: "Let's get your first AI worker live.",
    subtitle: 'Free to start. 10 minutes to first AI response.',
    final: true,
    ctas: [
      { label: '💬 Try Live Demo', href: '/try/dental', primary: true },
      { label: 'Get Started Free', href: '/signup/agency', primary: false },
      { label: 'Request a Demo', href: '/get-demo', primary: false },
    ],
    cta: null,
    accent: 'text-white',
  },
];

export default function PitchPage() {
  const [slide, setSlide] = useState(0);
  const total = SLIDES.length;
  const current = SLIDES[slide];

  const prev = useCallback(() => setSlide(s => Math.max(0, s - 1)), []);
  const next = useCallback(() => setSlide(s => Math.min(total - 1, s + 1)), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <PublicNav />
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 font-black text-lg">
          <Zap className="h-4 w-4 text-indigo-400" /> Kyra AI
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">{slide + 1} / {total}</span>
          <Link href="/solo" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-semibold transition">
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Slide */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="max-w-3xl w-full">
          {/* Tag */}
          <div className={`inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 ${current.accent}`}>
            {current.tag} · {slide + 1}/{total}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">{current.title}</h1>
          {current.subtitle && <p className="text-slate-400 text-lg sm:text-xl mb-10">{current.subtitle}</p>}

          {/* Content: stats */}
          {'content' in current && current.content && (
            <div className="grid sm:grid-cols-3 gap-4">
              {(current.content as {stat: string; label: string}[]).map(c => (
                <div key={c.stat} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <p className={`text-4xl font-black mb-2 ${current.accent}`}>{c.stat}</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{c.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Content: bullets */}
          {'bullets' in current && current.bullets && (
            <ul className="space-y-3">
              {(current.bullets as string[]).map(b => (
                <li key={b} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200">
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* Content: steps */}
          {'steps' in current && current.steps && (
            <div className="grid sm:grid-cols-2 gap-4">
              {(current.steps as {n: string; title: string; desc: string}[]).map(s => (
                <div key={s.n} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className={`text-3xl font-black mb-2 ${current.accent}`}>{s.n}</div>
                  <h3 className="font-bold text-white mb-1">{s.title}</h3>
                  <p className="text-slate-400 text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Content: table */}
          {'table' in current && current.table && (
            <div>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Plan</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Your cost</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Capacity</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Agency revenue</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Gross margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(current.table as {plan: string; cost: string; clients: string; revenue: string; margin: string}[]).map(r => (
                      <tr key={r.plan} className="border-b border-white/5">
                        <td className="px-4 py-3 font-semibold">{r.plan}</td>
                        <td className="px-4 py-3 text-slate-300">{r.cost}</td>
                        <td className="px-4 py-3 text-slate-300">{r.clients}</td>
                        <td className={`px-4 py-3 font-bold ${current.accent}`}>{r.revenue}</td>
                        <td className="px-4 py-3 text-green-400 font-bold">{r.margin}/mo</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {'tableNote' in current && <p className="text-xs text-slate-500 mt-2">{String(current.tableNote)}</p>}
            </div>
          )}

          {/* Content: demo industries */}
          {'demo' in current && current.demo && current.industries && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {(current.industries as {emoji: string; label: string; slug: string}[]).map(ind => (
                <Link key={ind.slug} href={`/try/${ind.slug}`} target="_blank"
                  className="flex flex-col items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 rounded-xl p-3 transition group">
                  <span className="text-2xl">{ind.emoji}</span>
                  <span className="text-xs text-slate-300 font-medium">{ind.label}</span>
                  <ExternalLink className="h-3 w-3 text-slate-600 group-hover:text-indigo-400 transition" />
                </Link>
              ))}
            </div>
          )}

          {/* Final slide CTAs */}
          {'final' in current && current.final && 'ctas' in current && current.ctas && (
            <div className="flex flex-wrap gap-3">
              {(current.ctas as {label: string; href: string; primary: boolean}[]).map(cta => (
                <Link key={cta.label} href={cta.href}
                  className={`font-bold px-6 py-3 rounded-xl transition text-sm flex items-center gap-2 ${
                    cta.primary
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-white/10 hover:bg-white/15 border border-white/10 text-white'
                  }`}>
                  {cta.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={prev} disabled={slide === 0}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 transition">
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-6 bg-indigo-400' : 'w-1.5 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>

          <button onClick={next} disabled={slide === total - 1}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 transition">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">← → arrow keys to navigate</p>
      </div>
      <PublicFooter />
    </div>
  );
}
