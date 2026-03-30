'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, ArrowRight, DollarSign, TrendingUp,
  Users, Zap, Bot, MessageSquare, CheckCircle2, Clock, Globe,
  Smartphone, Shield, BarChart3, Sparkles, Star, Briefcase,
  Home, Wifi, Award, Play, ChevronDown,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Dot({ active }: { active: boolean }) {
  return (
    <div className={`rounded-full transition-all duration-300 ${
      active ? 'w-8 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'
    }`} />
  );
}

function Tag({ children, color = 'indigo' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    violet: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {children}
    </span>
  );
}

function MoneyCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 text-center ${accent ? 'bg-emerald-500 text-white' : 'bg-white/10 border border-white/10 text-white'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${accent ? 'text-emerald-100' : 'text-slate-400'}`}>{label}</p>
      <p className={`text-3xl sm:text-4xl font-black ${accent ? 'text-white' : 'text-emerald-400'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-emerald-100' : 'text-slate-500'}`}>{sub}</p>}
    </div>
  );
}

// ── Slides ────────────────────────────────────────────────────────────────────

const SLIDES = [

  // ── 1: Hook ──────────────────────────────────────────────────────────────
  {
    id: 'hook',
    bg: 'from-slate-950 via-indigo-950 to-slate-950',
    content: (
      <div className="flex flex-col items-center justify-center text-center px-6 sm:px-12 h-full gap-6">
        <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm font-medium text-white/70">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          The AI Agency Opportunity — 2026
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] max-w-4xl">
          Build a real AI agency<br />
          <span className="text-indigo-400">from anywhere.</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed">
          Small businesses need AI right now — and don't know where to start.
          Kyra gives you the platform, the tools, and the system to serve them.
          No coding. No guesswork. No fake promises.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Tag color="emerald">✓ Real recurring revenue</Tag>
          <Tag color="indigo">✓ Work from anywhere</Tag>
          <Tag color="amber">✓ Massive market, early timing</Tag>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm mt-4 animate-bounce">
          <ChevronDown className="h-4 w-4" />
          Swipe to explore
        </div>
      </div>
    ),
  },

  // ── 2: The Problem ───────────────────────────────────────────────────────
  {
    id: 'problem',
    bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-8">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">The Problem</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            Every small business<br />
            <span className="text-rose-400">is losing leads right now.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Clock, stat: '78%', label: 'of leads go to the first business that responds', color: 'text-rose-400' },
            { icon: MessageSquare, stat: '5 min', label: 'response time kills conversion rate by 80%', color: 'text-amber-400' },
            { icon: Smartphone, stat: '24/7', label: 'Customers expect instant answers — even at 2 AM', color: 'text-indigo-400' },
            { icon: DollarSign, stat: '$0', label: 'Revenue from a lead that never gets a reply', color: 'text-rose-400' },
          ].map(({ icon: Icon, stat, label, color }) => (
            <div key={stat} className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="bg-white/10 rounded-xl p-3 shrink-0">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl font-black ${color}`}>{stat}</p>
                <p className="text-slate-400 text-sm leading-snug mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-sm">
          Plumbers, dentists, restaurants, gyms, law firms, contractors — they all have this problem.
          None of them have time to fix it. <span className="text-white font-semibold">That's where you come in.</span>
        </p>
      </div>
    ),
  },

  // ── 3: The Opportunity ───────────────────────────────────────────────────
  {
    id: 'opportunity',
    bg: 'from-indigo-950 via-slate-900 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-8">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">The Opportunity</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            The AI gold rush<br />
            <span className="text-indigo-400">is happening right now.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { stat: '33M+', label: 'Small businesses in the US alone', sub: 'All potential clients', color: 'text-indigo-400' },
            { stat: '<5%', label: 'Currently using AI tools effectively', sub: 'The gap you fill', color: 'text-amber-400' },
            { stat: '$500–2K', label: 'Monthly recurring per client', sub: 'Industry standard rate', color: 'text-emerald-400' },
          ].map(({ stat, label, sub, color }) => (
            <div key={stat} className="text-center bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className={`text-4xl sm:text-5xl font-black ${color} mb-2`}>{stat}</p>
              <p className="text-white font-semibold text-sm">{label}</p>
              <p className="text-slate-500 text-xs mt-1">{sub}</p>
            </div>
          ))}
        </div>
        <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-2xl p-5">
          <p className="text-white font-semibold mb-1">Why now is the right time</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Business owners have heard about AI but don't know how to use it. They're looking for someone to
            set it up and manage it for them. The market is hungry, competition is still low,
            and the platform to deliver it already exists. You just need to show up.
          </p>
        </div>
      </div>
    ),
  },

  // ── 4: What is Kyra ─────────────────────────────────────────────────────
  {
    id: 'what-is-kyra',
    bg: 'from-slate-950 to-indigo-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-8">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">The Platform</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            Kyra is your<br />
            <span className="text-indigo-400">AI workforce platform.</span>
          </h2>
          <p className="text-slate-400 mt-3 text-base max-w-2xl">
            A white-label platform that lets you deploy, manage, and monetize AI workers for your
            clients — all from one dashboard. No infrastructure. No coding.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Bot, title: 'AI Workers per client', desc: 'Each client gets a dedicated AI that knows their business — services, hours, prices, personality. Responds to leads in under 60 seconds.', color: 'text-indigo-400 bg-indigo-500/10' },
            { icon: Globe, title: 'Multi-channel coverage', desc: 'SMS (via GoHighLevel), web chat widget, Telegram, WhatsApp, and voice calls — one AI handles all channels at once.', color: 'text-emerald-400 bg-emerald-500/10' },
            { icon: BarChart3, title: 'Built-in CRM & pipeline', desc: 'Contacts, conversations, deals, calendar booking — all managed automatically by the AI and visible in your dashboard.', color: 'text-amber-400 bg-amber-500/10' },
            { icon: Shield, title: 'Your brand, your business', desc: 'White-label branding: your logo, your colors, your company name on the dashboard, client portal, and chat widget.', color: 'text-violet-400 bg-violet-500/10' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className={`rounded-xl p-3 h-fit shrink-0 ${color.split(' ')[1]}`}>
                <Icon className={`h-5 w-5 ${color.split(' ')[0]}`} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm mb-1">{title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 5: What the AI Actually Does ─────────────────────────────────────────
  {
    id: 'ai-capabilities',
    bg: 'from-slate-950 via-slate-900 to-indigo-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-6">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">What the AI Does</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            A full-time employee.<br />
            <span className="text-emerald-400">Without the salary.</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { emoji: '💬', title: 'Responds in < 60 sec', desc: 'Every inbound SMS, web chat, Telegram, WhatsApp' },
            { emoji: '📅', title: 'Books appointments', desc: 'Checks availability, confirms in GHL calendar' },
            { emoji: '🏷️', title: 'Qualifies leads', desc: 'Asks the right questions, scores and tags hot prospects' },
            { emoji: '📋', title: 'Updates the CRM', desc: 'Creates contacts, logs conversations, moves deals in pipeline' },
            { emoji: '📞', title: 'Answers calls', desc: 'Picks up, has a natural voice conversation, takes action' },
            { emoji: '🚨', title: 'Escalates when needed', desc: 'Flags complex issues to a human instantly' },
            { emoji: '🔄', title: 'Follows up on leads', desc: 'Automated sequences via GHL workflows' },
            { emoji: '📊', title: 'Reports everything', desc: 'Every conversation, lead, outcome visible to you' },
            { emoji: '🌐', title: 'Works 24/7/365', desc: 'No sick days, no holidays, no overtime pay' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/8 rounded-xl p-4">
              <span className="text-2xl">{emoji}</span>
              <p className="text-white font-semibold text-xs mt-2 mb-1">{title}</p>
              <p className="text-slate-500 text-xs leading-snug">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs text-center">
          All powered by the latest AI models (Claude, GPT-4o) with automatic fallback and routing.
        </p>
      </div>
    ),
  },

  // ── 6: 50+ Templates ─────────────────────────────────────────────────────
  {
    id: 'templates',
    bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-6">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">Ready-Made Templates</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            50+ industries.<br />
            <span className="text-indigo-400">Launch in minutes.</span>
          </h2>
          <p className="text-slate-400 mt-3">Each template has a pre-built AI personality, greeting, and instructions — tailored for that industry. Edit or deploy as-is.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            'Dental', 'Real Estate', 'Law Firm', 'HVAC', 'Auto Repair',
            'Gym & Fitness', 'Restaurant', 'Med Spa', 'Insurance', 'Veterinary',
            'Salon & Barbershop', 'Roofing', 'Cannabis Dispensary', 'Moving Company',
            'Plumbing', 'Accounting', 'Photography', 'Tutoring', 'Travel Agency',
            'Cleaning Service', '+ 30 more',
          ].map((industry) => (
            <span
              key={industry}
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                industry === '+ 30 more'
                  ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
                  : 'border-white/10 text-slate-300 bg-white/5'
              }`}
            >
              {industry}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          {[
            { n: '1', title: 'Pick a template', desc: 'Choose the client\'s industry. AI is pre-configured.', time: '1 min' },
            { n: '2', title: 'Connect channels', desc: 'Paste a GHL token or embed the web chat widget.', time: '2 min' },
            { n: '3', title: 'Go live', desc: 'AI starts responding to every inbound message.', time: '0 min' },
          ].map(({ n, title, desc, time }) => (
            <div key={n} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm">{n}</div>
                <span className="text-indigo-400 text-xs font-semibold">{time}</span>
              </div>
              <p className="text-white font-semibold text-sm mb-1">{title}</p>
              <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 7: The Business Model ─────────────────────────────────────────────────
  {
    id: 'business-model',
    bg: 'from-slate-950 via-emerald-950/30 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-6">
        <div>
          <p className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-3">The Business Model</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            You charge clients.<br />
            <span className="text-emerald-400">You keep the margin.</span>
          </h2>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-slate-400 text-sm mb-5">How the numbers work (your Pro plan example):</p>
          <div className="grid grid-cols-3 gap-4 text-center mb-6">
            <div>
              <p className="text-slate-500 text-xs mb-1">You pay Kyra</p>
              <p className="text-2xl sm:text-3xl font-black text-white">$299<span className="text-sm text-slate-500">/mo</span></p>
              <p className="text-slate-500 text-xs mt-1">Pro plan · 10 clients</p>
            </div>
            <div className="flex items-center justify-center text-slate-600 text-2xl font-black">→</div>
            <div>
              <p className="text-slate-500 text-xs mb-1">You charge clients</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400">$500–2K<span className="text-sm text-emerald-600">/mo each</span></p>
              <p className="text-slate-500 text-xs mt-1">Industry standard rate</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MoneyCard label="Your cost per client" value="~$30" sub="$299 ÷ 10 clients" />
            <MoneyCard label="You charge per client" value="$997" sub="Conservative estimate" />
            <MoneyCard label="Your margin" value="$967/client" sub="per month, recurring" accent />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-emerald-400 font-semibold text-sm mb-1">5 clients = $4,850+/mo</p>
            <p className="text-slate-400 text-xs">After paying for Kyra Pro ($299) you keep ~$4,556/mo</p>
          </div>
          <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-emerald-400 font-semibold text-sm mb-1">10 clients = $9,670+/mo</p>
            <p className="text-slate-400 text-xs">Fully recurring — clients pay monthly as long as the AI works</p>
          </div>
        </div>

        <p className="text-slate-600 text-xs">
          * Revenue figures are estimates based on market pricing. Your actual results depend on your sales, pricing, and client retention.
          Kyra does not guarantee income.
        </p>
      </div>
    ),
  },

  // ── 8: Why Passive / Recurring ───────────────────────────────────────────
  {
    id: 'recurring',
    bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-8">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">Why It's Recurring</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            Set it up once.<br />
            <span className="text-indigo-400">Get paid every month.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: Zap,
              title: 'The AI never stops working',
              desc: 'Once configured, the AI handles every inbound lead 24/7 — you don\'t touch it unless the client wants changes.',
              color: 'text-amber-400 bg-amber-500/10',
            },
            {
              icon: TrendingUp,
              title: 'Clients see real results',
              desc: 'Businesses that respond to leads instantly close more deals. When clients see revenue from the AI, they keep paying — month after month.',
              color: 'text-emerald-400 bg-emerald-500/10',
            },
            {
              icon: Users,
              title: 'Low churn by design',
              desc: 'Switching AI tools is painful. Clients who integrate Kyra into their workflow tend to stay. The longer they stay, the more data the AI has, the better it gets.',
              color: 'text-indigo-400 bg-indigo-500/10',
            },
            {
              icon: Briefcase,
              title: 'You manage — not build',
              desc: 'You\'re not coding anything. You use the Kyra dashboard to deploy, monitor, and report results to clients. The platform does the heavy lifting.',
              color: 'text-violet-400 bg-violet-500/10',
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className={`rounded-xl p-3 h-fit shrink-0 ${color.split(' ')[1]}`}>
                <Icon className={`h-5 w-5 ${color.split(' ')[0]}`} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm mb-1">{title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-indigo-900/30 border border-indigo-500/20 rounded-2xl p-5 text-center">
          <p className="text-indigo-300 font-semibold mb-1">This is a service business, not passive income in the traditional sense</p>
          <p className="text-slate-500 text-xs max-w-xl mx-auto">You acquire clients, set them up, and handle occasional requests. The AI handles the day-to-day work. Your time investment drops significantly after onboarding.</p>
        </div>
      </div>
    ),
  },

  // ── 9: Kyra Pricing ─────────────────────────────────────────────────────
  {
    id: 'pricing',
    bg: 'from-indigo-950 via-slate-900 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-12 h-full max-w-5xl mx-auto gap-6">
        <div className="text-center">
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">Kyra Pricing</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Your cost to run the platform.
          </h2>
          <p className="text-slate-400 mt-2">You charge clients separately — these are your platform fees.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: 'Free', price: '$0', clients: 1, highlight: false, features: ['1 AI worker', 'All channels', 'Built-in CRM', 'GHL integration', 'No credit card'], cta: 'Start Free' },
            { name: 'Lite', price: '$99', clients: 3, highlight: false, features: ['3 AI workers', '50+ templates', 'Analytics', 'Escalation alerts', 'Performance reports'], cta: 'Start Lite' },
            { name: 'Pro', price: '$299', clients: 10, highlight: true, features: ['10 AI workers', 'White-label branding', 'Custom templates', 'Revenue tracking', 'Priority support'], cta: 'Start Pro' },
            { name: 'Scale', price: '$499', clients: 20, highlight: false, features: ['20 AI workers', 'Dedicated infra', 'Custom domains', 'Advanced analytics', 'Phone support'], cta: 'Start Scale' },
          ].map(({ name, price, clients, highlight, features, cta }) => (
            <div key={name} className={`rounded-2xl p-5 flex flex-col ${
              highlight
                ? 'bg-white text-gray-900 ring-2 ring-indigo-400 shadow-xl shadow-indigo-500/20 scale-[1.02]'
                : 'bg-white/8 border border-white/10 text-white'
            }`}>
              {highlight && (
                <div className="text-center mb-3">
                  <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</span>
                </div>
              )}
              <p className={`font-bold text-sm ${highlight ? 'text-gray-900' : 'text-white'}`}>{name}</p>
              <p className={`text-3xl font-black mt-1 ${highlight ? 'text-gray-900' : 'text-white'}`}>{price}<span className={`text-xs font-normal ${highlight ? 'text-gray-500' : 'text-slate-400'}`}>/mo</span></p>
              <p className={`text-xs mt-1 mb-4 ${highlight ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>{clients} client{clients > 1 ? 's' : ''}</p>
              <ul className="space-y-2 flex-1 mb-4">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${highlight ? 'text-emerald-500' : 'text-indigo-400'}`} />
                    <span className={highlight ? 'text-gray-600' : 'text-slate-400'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup/agency"
                className={`block text-center text-xs font-bold py-2.5 rounded-xl transition ${
                  highlight
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                {cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs text-center">
          All plans: multi-channel AI, CRM, GHL integration, conversation inbox, AI personality customization. Cancel anytime.
        </p>
      </div>
    ),
  },

  // ── 10: Who This Is For ──────────────────────────────────────────────────
  {
    id: 'who',
    bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-8">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">Who This Is For</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            You don't need to be<br />
            <span className="text-indigo-400">a tech expert.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Briefcase, title: 'Marketing agencies', desc: 'Add AI workers to your existing service stack. Upsell current clients or use it as a lead-gen offer.', good: true },
            { icon: Users, title: 'Coaches & consultants', desc: 'Help your clients implement AI without doing the technical work yourself. Kyra handles the delivery.', good: true },
            { icon: Home, title: 'Work-from-home entrepreneurs', desc: 'Build an agency from scratch. Start with free plan, get first client, scale from there.', good: true },
            { icon: Wifi, title: 'Digital marketing freelancers', desc: 'Add recurring revenue to project-based work. One AI client retainer is worth 3-4 one-off projects.', good: true },
          ].map(({ icon: Icon, title, desc, good }) => (
            <div key={title} className={`flex gap-4 rounded-2xl p-5 border ${good ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
              <div className={`rounded-xl p-3 h-fit shrink-0 ${good ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <Icon className={`h-5 w-5 ${good ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-semibold text-sm">{title}</p>
                  {good && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-amber-900/20 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-amber-400 font-semibold text-sm mb-1">What you actually need</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            The ability to have a conversation with a business owner, show them results, and follow up. 
            Kyra handles everything else — the AI, the CRM, the channels, the reporting.
          </p>
        </div>
      </div>
    ),
  },

  // ── 11: What You Get / Dashboard ─────────────────────────────────────────
  {
    id: 'dashboard',
    bg: 'from-indigo-950 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-8">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">Your Agency Dashboard</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            One place to manage<br />
            <span className="text-indigo-400">every client's AI.</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { emoji: '🤖', title: 'AI Worker per client', desc: 'Each client gets a fully configured AI with their own personality and knowledge' },
            { emoji: '💬', title: 'Conversation inbox', desc: 'See every message the AI sends and receives across all channels' },
            { emoji: '📊', title: 'Analytics dashboard', desc: 'Track leads, conversions, response times, and revenue per client' },
            { emoji: '🔗', title: 'GHL integration', desc: 'Connect each client\'s GoHighLevel sub-account — contacts, calendar, pipeline, workflows' },
            { emoji: '🏷️', title: 'White-label branding', desc: 'Your logo, your name, your colors on everything the client sees' },
            { emoji: '🌐', title: 'Client portal', desc: 'Each client gets a login to view their AI\'s activity and conversations' },
            { emoji: '📱', title: 'Multi-channel AI', desc: 'SMS, web chat, Telegram, WhatsApp, voice — one AI handles all' },
            { emoji: '📋', title: 'CRM built in', desc: 'Contacts, deals, pipeline — no extra tools needed' },
            { emoji: '🚨', title: 'Escalation alerts', desc: 'Get notified when a lead needs a human touch' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/8 rounded-xl p-4">
              <span className="text-2xl">{emoji}</span>
              <p className="text-white font-semibold text-xs mt-2 mb-1">{title}</p>
              <p className="text-slate-500 text-xs leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 12: Getting Started ──────────────────────────────────────────────────
  {
    id: 'getting-started',
    bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-8">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">How to Start</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            From zero to<br />
            <span className="text-emerald-400">first paying client.</span>
          </h2>
        </div>
        <div className="space-y-4">
          {[
            {
              n: '01', title: 'Sign up free', desc: 'Create your Kyra account. No credit card. You get 1 AI worker and 50 welcome credits to test everything.',
              tag: 'Today', tagColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
            },
            {
              n: '02', title: 'Set up your demo', desc: 'Pick any industry template and configure a demo AI worker. Use the live demo link to show prospects — no login needed on their end.',
              tag: 'Day 1', tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
            },
            {
              n: '03', title: 'Get your first client', desc: 'Reach out to local businesses in any service industry. Show the demo. Offer to deploy it for them for a monthly fee.',
              tag: 'Week 1–2', tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
            },
            {
              n: '04', title: 'Upgrade and scale', desc: 'Once you have 1–2 paying clients, upgrade to Lite ($99/mo). Keep adding clients. Each one is mostly managed by the AI.',
              tag: 'Month 1+', tagColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
            },
          ].map(({ n, title, desc, tag, tagColor }) => (
            <div key={n} className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">{n}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tagColor}`}>{tag}</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 13: Honest Talk ──────────────────────────────────────────────────────
  {
    id: 'honest',
    bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-4xl mx-auto gap-8 text-center">
        <div>
          <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3">The Honest Part</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            This is a real business.<br />
            <span className="text-amber-400">Not a get-rich-quick scheme.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {[
            { emoji: '✅', title: 'What\'s real', items: [
              'The platform works — AI responds to leads in real time',
              'Businesses do pay $500–2K/mo for this kind of service',
              'Recurring revenue compounds over time as you add clients',
              'You can start for free and upgrade as you earn',
              'The market for AI services is genuinely growing',
            ]},
            { emoji: '⚠️', title: 'What\'s not guaranteed', items: [
              'You still have to find and close clients yourself',
              'Results depend on your sales effort and follow-through',
              'Income is not passive — you manage client relationships',
              'It takes time to build a portfolio of paying clients',
              'No platform can guarantee you a specific income level',
            ]},
          ].map(({ emoji, title, items }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-white font-semibold text-sm mb-3">{emoji} {title}</p>
              <ul className="space-y-2">
                {items.map(item => (
                  <li key={item} className="text-slate-400 text-xs leading-snug flex gap-2">
                    <span className="mt-0.5 shrink-0">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs">
          Kyra is a software platform. Your success depends on your effort, your market, and your clients.
          We give you the best tools available — what you build with them is up to you.
        </p>
      </div>
    ),
  },

  // ── 14: CTA ──────────────────────────────────────────────────────────────
  {
    id: 'cta',
    bg: 'from-indigo-950 via-indigo-900 to-slate-950',
    content: (
      <div className="flex flex-col items-center justify-center text-center px-6 sm:px-12 h-full gap-8">
        <Award className="h-14 w-14 text-indigo-400" />
        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] max-w-3xl">
          Start building<br />
          <span className="text-indigo-400">your AI agency.</span>
        </h2>
        <p className="text-slate-300 text-lg max-w-xl leading-relaxed">
          Free plan. No credit card. Your first AI worker live in under 10 minutes.
          Everything else grows from there.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup/agency"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-lg shadow-indigo-500/30"
          >
            Start Free <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/try/dental"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition text-white font-bold text-lg px-10 py-4 rounded-2xl border border-white/20"
          >
            <Play className="h-5 w-5" />
            See a Live Demo
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          {['Free to start', 'No credit card', 'Cancel anytime', '50+ industry templates', 'Real AI — not a chatbot'].map(tag => (
            <div key={tag} className="flex items-center gap-1.5 text-slate-400 text-sm">
              <Star className="h-3.5 w-3.5 text-indigo-400 fill-indigo-400" />
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function AIAgencyPitchPage() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const prev = useCallback(() => {
    if (current > 0) {
      setDirection('left');
      setCurrent(c => c - 1);
    }
  }, [current]);

  const next = useCallback(() => {
    if (current < SLIDES.length - 1) {
      setDirection('right');
      setCurrent(c => c + 1);
    }
  }, [current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  // Touch/swipe
  useEffect(() => {
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [next, prev]);

  const slide = SLIDES[current];

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950">
      {/* Slide */}
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.bg} transition-all duration-500`}>
        <div className="absolute inset-0 overflow-y-auto">
          <div className="min-h-full py-16">
            {slide.content}
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-black/20 backdrop-blur-sm z-10">
        <Link href="/" className="text-white/60 hover:text-white text-sm font-semibold transition flex items-center gap-1.5">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-black text-xs">K</div>
          Kyra
        </Link>
        <p className="text-white/50 text-xs font-medium">
          {current + 1} / {SLIDES.length}
        </p>
        <Link
          href="/signup/agency"
          className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition"
        >
          Start Free →
        </Link>
      </div>

      {/* Dot nav */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        {SLIDES.map((_, i) => <Dot key={i} active={i === current} />)}
      </div>

      {/* Arrow buttons */}
      <button
        onClick={prev}
        disabled={current === 0}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white disabled:opacity-0 disabled:pointer-events-none transition"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        disabled={current === SLIDES.length - 1}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white disabled:opacity-0 disabled:pointer-events-none transition"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
