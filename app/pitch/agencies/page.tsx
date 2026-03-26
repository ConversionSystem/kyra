'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Zap, Users, DollarSign, Clock,
  CheckCircle2, ArrowRight, MessageSquare, Phone, Globe, BarChart3,
  Shield, Sparkles, TrendingUp, Award, Bot,
} from 'lucide-react';

// ── Slide data ────────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  bg: string;
  content: React.ReactNode;
}

function SlideCounter({ current, total }: { current: number; total: number }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current ? 'w-8 bg-white' : 'w-1.5 bg-white/30'
          }`}
        />
      ))}
    </div>
  );
}

function PricingCard({
  name, price, clients, credits, features, highlighted, cta,
}: {
  name: string; price: number; clients: number; credits: string;
  features: string[]; highlighted?: boolean; cta: string;
}) {
  return (
    <div className={`rounded-2xl p-6 flex flex-col ${
      highlighted
        ? 'bg-white text-gray-900 ring-2 ring-indigo-400 shadow-2xl shadow-indigo-500/20 scale-105'
        : 'bg-white/10 text-white border border-white/20'
    }`}>
      {highlighted && (
        <div className="text-center mb-3">
          <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
        </div>
      )}
      <h3 className={`text-xl font-bold ${highlighted ? 'text-gray-900' : 'text-white'}`}>{name}</h3>
      <div className="flex items-baseline gap-1 mt-2">
        <span className="text-4xl font-black">${price}</span>
        <span className={`text-sm ${highlighted ? 'text-gray-500' : 'text-white/60'}`}>/mo</span>
      </div>
      <p className={`text-sm mt-1 ${highlighted ? 'text-indigo-600 font-semibold' : 'text-white/70'}`}>
        {clients} AI worker{clients !== 1 ? 's' : ''} · {credits} credits/mo
      </p>
      <ul className="mt-4 space-y-2 flex-1">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${highlighted ? 'text-green-500' : 'text-indigo-400'}`} />
            <span className={highlighted ? 'text-gray-700' : 'text-white/80'}>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/signup/agency"
        className={`mt-5 block text-center font-bold py-3 rounded-xl transition ${
          highlighted
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

const SLIDES: Slide[] = [
  // ── Slide 1: Title ──────────────────────────────────────────────────────
  {
    id: 'title',
    bg: 'from-slate-900 via-indigo-950 to-slate-900',
    content: (
      <div className="flex flex-col items-center justify-center text-center px-8 h-full">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm font-medium text-white/80 mb-6">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            The AI Workforce Platform for Agencies
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.05] mb-6">
            Give every client
            <br />
            <span className="text-indigo-400">an AI worker.</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Full website + AI worker + CRM for every client. Builds a 15-25 page SEO site,
            deploys an AI that books appointments and responds to leads 24/7 — all from one dashboard.
            White-labeled under your brand.
          </p>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-slate-500 text-sm">Powered by</span>
          <span className="text-xl sm:text-2xl font-black text-white">Kyra</span>
        </div>
      </div>
    ),
  },

  // ── Slide 2: The Problem ────────────────────────────────────────────────
  {
    id: 'problem',
    bg: 'from-red-950 via-slate-900 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-10">
          Your clients are <span className="text-red-400">bleeding leads.</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { stat: '78%', text: 'of leads go to the first business that responds', icon: Clock },
            { stat: '5 min', text: 'Average response time kills conversion by 80%', icon: MessageSquare },
            { stat: '$0', text: 'Revenue from leads that never get a reply', icon: DollarSign },
            { stat: '24/7', text: 'Customers expect instant answers — even at 2 AM', icon: Phone },
          ].map(({ stat, text, icon: Icon }) => (
            <div key={stat} className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-start gap-4">
              <div className="rounded-xl bg-red-500/20 p-3 shrink-0">
                <Icon className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-black text-white">{stat}</p>
                <p className="text-sm text-slate-400 mt-1">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-lg mt-8 text-center">
          Your clients can't hire 24/7 staff. But you can give them something better.
        </p>
      </div>
    ),
  },

  // ── Slide 3: The Solution ───────────────────────────────────────────────
  {
    id: 'solution',
    bg: 'from-indigo-950 via-slate-900 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
            Meet <span className="text-indigo-400">Kyra</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            AI worker + full SEO website + CRM for every client. Deployed in minutes, managed from one dashboard, 
            white-labeled under your brand.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Globe, title: 'AI Website Builder', desc: 'A 15-25 page SEO-optimized website generated by AI in minutes. Service pages, city pages, FAQs, blog, schema markup — all written by Claude AI.', color: 'text-emerald-400 bg-emerald-500/20' },
            { icon: Bot, title: 'AI Workers', desc: 'A dedicated AI for each client that knows their business, services, hours, and personality. Responds to leads in under 60 seconds.', color: 'text-indigo-400 bg-indigo-500/20' },
            { icon: MessageSquare, title: 'Every Channel', desc: 'SMS (via GHL), web chat, Telegram, WhatsApp, voice calls — one AI brain handles all channels simultaneously.', color: 'text-amber-400 bg-amber-500/20' },
            { icon: Shield, title: 'Your Brand', desc: 'Your logo, your colors, your company name across dashboard, portal, chat widget, and generated websites.', color: 'text-purple-400 bg-purple-500/20' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className={`rounded-xl ${color} p-3 w-fit mb-4`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── Slide 4: What the AI actually does ──────────────────────────────────
  {
    id: 'capabilities',
    bg: 'from-slate-900 via-slate-900 to-indigo-950',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4 text-center">
          What your AI worker does <span className="text-indigo-400">every day</span>
        </h2>
        <p className="text-slate-400 text-center mb-10">For each of your clients — automatically, 24/7</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { emoji: '💬', title: 'Responds in < 60 seconds', desc: 'Every inbound message — SMS, web chat, Telegram, WhatsApp' },
            { emoji: '📅', title: 'Books appointments', desc: 'Checks GHL calendar availability, books and confirms' },
            { emoji: '🏷️', title: 'Qualifies leads', desc: 'Asks the right questions, scores leads, tags hot ones' },
            { emoji: '📋', title: 'Updates the CRM', desc: 'Creates contacts, logs conversations, moves deals' },
            { emoji: '📞', title: 'Answers phone calls', desc: 'Picks up, has a natural conversation, takes action' },
            { emoji: '🔄', title: 'Follows up on leads', desc: 'Automated follow-up sequences via GHL workflows' },
            { emoji: '🚨', title: 'Escalates to humans', desc: 'Complex issues get flagged instantly to your team' },
            { emoji: '🌐', title: 'Works across all channels', desc: 'One AI brain handles SMS, voice, web chat, and Telegram simultaneously' },
            { emoji: '📊', title: 'Reports performance', desc: 'You see every conversation, every lead, every outcome' },
            { emoji: '🌐', title: 'Builds a full website', desc: '15-25 SEO pages with service pages, city pages, FAQs, blog, and schema markup' },
            { emoji: '📈', title: 'Grows the site with AI', desc: 'Growth Engine suggests new pages to rank for more search terms' },
            { emoji: '🔍', title: 'Web Intelligence', desc: 'AI browses the web live for competitor pricing, lead enrichment, and industry news' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl shrink-0">{emoji}</span>
              <div>
                <p className="font-semibold text-white text-sm">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── Slide 5: The Agency Revenue Opportunity ─────────────────────────────
  {
    id: 'revenue',
    bg: 'from-emerald-950 via-slate-900 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
          The math is <span className="text-emerald-400">ridiculously good.</span>
        </h2>
        <p className="text-slate-400 text-lg mb-10">Your cost vs. what you charge your clients</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-8 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <div>
              <p className="text-sm text-slate-400 mb-1">Your cost per client</p>
              <p className="text-2xl sm:text-4xl font-black text-white">~$25</p>
              <p className="text-xs text-slate-500">platform cost/client on Pro</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">What agencies charge</p>
              <p className="text-2xl sm:text-4xl font-black text-emerald-400">$500–2,000</p>
              <p className="text-xs text-slate-500">per client per month</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Your margin</p>
              <p className="text-2xl sm:text-4xl font-black text-emerald-400">95%+</p>
              <p className="text-xs text-slate-500">pure recurring revenue</p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-slate-400 text-sm mb-4">Example: 10 clients on Pro plan ($299/mo)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <p className="text-lg sm:text-xl sm:text-2xl font-black text-white">$299/mo</p>
                <p className="text-xs text-slate-500">Your Kyra cost</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-emerald-400">$9,970/mo</p>
                <p className="text-xs text-slate-500">Client revenue (10 × $997)</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-emerald-400">$9,671/mo</p>
                <p className="text-xs text-slate-500">Net profit</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-sm">
          No extra staff. No hourly work. Profit scales with every client you add.
        </p>
      </div>
    ),
  },

  // ── Slide 6: How It Works ───────────────────────────────────────────────
  {
    id: 'how-it-works',
    bg: 'from-slate-900 via-indigo-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4 text-center">
          Live in <span className="text-indigo-400">under 10 minutes.</span> Not 5 weeks.
        </h2>
        <p className="text-slate-400 text-center mb-12">No developers. No code. No infrastructure to manage.</p>

        <div className="space-y-6">
          {[
            { n: 1, title: 'Add a client', desc: 'Pick an industry template. AI personality, greeting, and instructions are pre-written. Edit if you want — or just deploy.', time: '1 min' },
            { n: 2, title: 'Connect their channels', desc: 'Paste a GHL token, Telegram bot key, or embed the web chat widget. One field, one click.', time: '2 min' },
            { n: 3, title: 'Go live', desc: 'The AI starts responding to every inbound message within 60 seconds. You monitor from the dashboard.', time: '0 min' },
          ].map(({ n, title, desc, time }) => (
            <div key={n} className="flex items-start gap-4 sm:gap-6">
              <div className="shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl sm:text-2xl font-black text-white">
                {n}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white">{title}</h3>
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/20 px-2.5 py-0.5 rounded-full">{time}</span>
                </div>
                <p className="text-slate-400 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── Slide 7: Why agencies choose Kyra ───────────────────────────────────
  {
    id: 'why-kyra',
    bg: 'from-slate-900 via-slate-900 to-purple-950',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-10 text-center">
          Why agencies choose <span className="text-indigo-400">Kyra</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { icon: Users, title: 'One dashboard for all clients', desc: 'Manage 20 AI workers from a single login. See every conversation, every lead, every metric.' },
            { icon: Shield, title: 'White-label branding', desc: 'Your logo, colors, and name on dashboard, portal, and chat widget. Custom domains coming soon.' },
            { icon: Zap, title: '34+ industry templates', desc: 'Dental, legal, HVAC, cannabis, real estate, restaurants, contractors, insurance, salons, and more — launch a new client in minutes.' },
            { icon: BarChart3, title: 'Built-in CRM & analytics', desc: 'Contacts, deals, pipeline, conversation inbox, performance dashboards — all included.' },
            { icon: Phone, title: 'Voice AI included', desc: 'Your AI worker answers phone calls, books appointments, and logs transcripts to the CRM.' },
            { icon: TrendingUp, title: 'Revenue on autopilot', desc: 'Charge $500–2,000/client. Your cost is $25–50/client. The margin is yours to keep.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="rounded-xl bg-indigo-500/20 p-3 shrink-0">
                <Icon className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── Slide 8: Objection handling ─────────────────────────────────────────
  {
    id: 'objections',
    bg: 'from-slate-900 via-slate-900 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-10 text-center">
          "But what about..."
        </h2>
        <div className="space-y-4">
          {[
            { q: '"My clients won\'t trust AI talking to their customers."', a: 'You control everything. Review mode lets you approve messages before they send. Escalation alerts notify you instantly. You set the guardrails — the AI follows them.' },
            { q: '"I can do this with GHL\'s built-in AI."', a: 'GHL gives you 2 custom intents and basic auto-replies. Kyra gives you a full AI worker — personality, memory, multi-channel, voice calls, CRM updates, follow-up sequences, appointment booking. It\'s not comparable.' },
            { q: '"What if the AI says something wrong?"', a: 'Three layers of safety: smart escalation (AI detects when to hand off), review queue (approve before send), and human takeover (you jump in anytime). The AI is a worker, not a loose cannon.' },
            { q: '"My clients are not tech-savvy."', a: 'Your clients never touch the platform. You manage everything. They just see results — faster responses, more bookings, fewer missed leads. You\'re the hero.' },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="font-bold text-white text-lg mb-2">{q}</p>
              <p className="text-slate-400 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── Slide 9: Pricing ────────────────────────────────────────────────────
  {
    id: 'pricing',
    bg: 'from-indigo-950 via-slate-900 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-12 min-h-full max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-2 text-center">
          Simple pricing. <span className="text-indigo-400">Massive margins.</span>
        </h2>
        <p className="text-slate-400 text-center mb-8">Start free. Upgrade when you're ready to scale.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <PricingCard
            name="Free"
            price={0}
            clients={1}
            credits="50 welcome"
            features={['1 AI worker + website', 'All channels', 'CRM included', 'GHL integration', 'No credit card']}
            cta="Start Free →"
          />
          <PricingCard
            name="Lite"
            price={99}
            clients={3}
            credits="10,000"
            features={['3 AI workers + websites', '34+ industry templates', 'Analytics dashboard', 'Escalation alerts', 'Performance reports']}
            cta="Start Lite →"
          />
          <PricingCard
            name="Pro"
            price={299}
            clients={10}
            credits="25,000"
            highlighted
            features={['10 AI workers + websites', 'White-label branding', 'Custom templates', 'Revenue tracking', 'Priority support']}
            cta="Start Pro →"
          />
          <PricingCard
            name="Scale"
            price={499}
            clients={20}
            credits="50,000"
            features={['20 AI workers + websites', 'Dedicated infrastructure', 'Custom domains', 'Advanced analytics', 'Phone support']}
            cta="Start Scale →"
          />
        </div>

        <p className="text-slate-500 text-sm text-center mt-6">
          All plans include: multi-channel messaging, CRM, GHL integration, AI personality customization, conversation inbox. Cancel anytime.
        </p>
      </div>
    ),
  },

  // ── Slide 10: CTA ───────────────────────────────────────────────────────
  {
    id: 'cta',
    bg: 'from-indigo-950 via-indigo-900 to-slate-900',
    content: (
      <div className="flex flex-col items-center justify-center text-center px-8 h-full">
        <div className="mb-8">
          <Award className="h-16 w-16 text-indigo-400 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            Ready to offer AI
            <br />
            to every client?
          </h2>
          <p className="text-xl text-slate-300 max-w-xl mx-auto leading-relaxed">
            Start free. Deploy your first AI worker in under 10 minutes. 
            No credit card. No commitment. Just results.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Link
            href="/signup/agency"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-base sm:text-xl px-6 sm:px-10 py-4 sm:py-5 rounded-2xl shadow-lg shadow-indigo-500/30"
          >
            Start Free Now <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/try/dental"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition text-white font-bold text-base sm:text-xl px-6 sm:px-10 py-4 sm:py-5 rounded-2xl border border-white/20"
          >
            See Live Demo
          </Link>
        </div>
        <p className="text-slate-500 text-sm mt-6">
          kyra.conversionsystem.com
        </p>
      </div>
    ),
  },
];

// ── Presentation Component ────────────────────────────────────────────────────

export default function AgencyPitchDeck() {
  const [current, setCurrent] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrent(c => Math.min(c + 1, total - 1));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrent(c => Math.max(c - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [total]);

  // Touch/swipe support
  useEffect(() => {
    let startX = 0;
    const handleTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const handleTouchEnd = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) setCurrent(c => Math.min(c + 1, total - 1));
        else setCurrent(c => Math.max(c - 1, 0));
      }
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [total]);

  const slide = SLIDES[current];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${slide.bg} relative overflow-hidden select-none`}>
      {/* Slide content */}
      <div className="min-h-screen flex items-center justify-center py-12 sm:py-16 overflow-y-auto">
        {slide.content}
      </div>

      {/* Navigation */}
      {current > 0 && (
        <button
          onClick={() => setCurrent(c => c - 1)}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      )}
      {current < total - 1 && (
        <button
          onClick={() => setCurrent(c => c + 1)}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      )}

      {/* Slide counter */}
      <SlideCounter current={current} total={total} />

      {/* Keyboard hint */}
      <div className="absolute bottom-6 right-6 text-xs text-white/20 hidden sm:block">
        ← → or swipe
      </div>
    </div>
  );
}
