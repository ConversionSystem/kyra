'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, ArrowRight, DollarSign, TrendingUp,
  Users, Zap, Bot, MessageSquare, CheckCircle2, Clock, Globe,
  Shield, BarChart3, Sparkles, Briefcase, Award, Play,
  Phone, Layers, Target, ChevronDown,
} from 'lucide-react';

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ children, color = 'slate' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
    slate: 'bg-white/8 text-slate-300 border-white/10',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${map[color] ?? map.slate}`}>
      {children}
    </span>
  );
}

function StatBox({ stat, label, sub, accent }: { stat: string; label: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 text-center ${accent
      ? 'bg-emerald-500 text-white'
      : 'bg-white/5 border border-white/10'}`}>
      <p className={`text-3xl sm:text-4xl font-black ${accent ? 'text-white' : 'text-emerald-400'}`}>{stat}</p>
      <p className={`text-sm font-semibold mt-1 ${accent ? 'text-white' : 'text-white'}`}>{label}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-emerald-100' : 'text-slate-500'}`}>{sub}</p>}
    </div>
  );
}

function FeatureRow({ icon: Icon, title, desc, color }: { icon: React.ElementType; title: string; desc: string; color: string }) {
  return (
    <div className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className={`rounded-xl p-3 h-fit shrink-0 ${color.replace('text-', 'bg-').replace('-400', '-500/10').replace('-300', '-500/10')}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-white font-semibold text-sm mb-1">{title}</p>
        <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Slides ────────────────────────────────────────────────────────────────────

const SLIDES = [

  // 1 ── HOOK ─────────────────────────────────────────────────────────────────
  {
    id: 'hook',
    bg: 'from-slate-950 via-indigo-950 to-slate-950',
    content: (
      <div className="flex flex-col items-center justify-center text-center px-6 sm:px-12 h-full gap-6">
        <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm font-medium text-white/70">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          Build an AI agency with Kyra
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] max-w-4xl">
          The AI workforce<br />
          <span className="text-indigo-400">opportunity is open.</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed">
          Small businesses across every industry are scrambling to adopt AI — 
          and most don't know where to start or who to trust.
          Kyra gives you the platform to be that person.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <Pill color="emerald">✓ Start free — no credit card</Pill>
          <Pill color="indigo">✓ 50+ industry templates</Pill>
          <Pill color="amber">✓ Work from anywhere</Pill>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-sm mt-6 animate-bounce">
          <ChevronDown className="h-4 w-4" />
          Arrow keys or swipe
        </div>
      </div>
    ),
  },

  // 2 ── THE MARKET ──────────────────────────────────────────────────────────
  {
    id: 'market',
    bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-8">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">The Market Right Now</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            AI adoption is accelerating.<br />
            <span className="text-indigo-400">Service businesses lag behind.</span>
          </h2>
          <p className="text-slate-400 mt-3 text-sm max-w-2xl">
            According to the U.S. Small Business Administration (2025), only about 6% of small businesses
            (under 250 employees) are actively using AI — compared to 11% of large enterprises.
            That gap is the opportunity.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBox stat="33M+" label="Small businesses in the US" sub="All potential clients" />
          <StatBox stat="~6%" label="Currently using AI (SBA 2025)" sub="Early adopter window" />
          <StatBox stat="58%" label="Using AI save 20+ hrs/mo" sub="Once they start" />
          <StatBox stat="$297B+" label="AI market size 2026" sub="Global projection" accent />
        </div>
        <div className="bg-indigo-900/30 border border-indigo-500/20 rounded-2xl p-5">
          <p className="text-white font-semibold text-sm mb-1">Why service businesses specifically</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Dentists, HVAC companies, law firms, salons — they can't hire a 24/7 receptionist.
            They miss leads when they're on a job. They follow up too slowly. A well-configured AI
            worker solves exactly that, at a fraction of the cost of an employee.
          </p>
        </div>
      </div>
    ),
  },

  // 3 ── THE PROBLEM ─────────────────────────────────────────────────────────
  {
    id: 'problem',
    bg: 'from-slate-950 via-rose-950/20 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-8">
        <div>
          <p className="text-rose-400 font-semibold text-sm uppercase tracking-wider mb-3">The Problem You Solve</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            Slow response = lost revenue.<br />
            <span className="text-rose-400">Every single day.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Clock, stat: '78%', detail: 'of leads convert to the first business that responds', color: 'text-rose-400', src: 'MIT/InsideSales.com research' },
            { icon: MessageSquare, stat: '5 min', detail: 'response window — after that, lead conversion drops 80%', color: 'text-amber-400', src: 'Harvard Business Review' },
            { icon: Phone, stat: '62%', detail: 'of calls to small businesses go unanswered', color: 'text-rose-400', src: 'BIA Advisory' },
            { icon: DollarSign, stat: '$0', detail: 'Revenue from a qualified lead that gets no reply', color: 'text-slate-400', src: '' },
          ].map(({ icon: Icon, stat, detail, color, src }) => (
            <div key={stat+detail} className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="bg-white/10 rounded-xl p-3 shrink-0">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl font-black ${color}`}>{stat}</p>
                <p className="text-slate-300 text-sm leading-snug mt-0.5">{detail}</p>
                {src && <p className="text-slate-600 text-xs mt-1">Source: {src}</p>}
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-sm">
          Plumbers, dentists, gyms, law firms, real estate agents — this is universal.
          <span className="text-white font-semibold"> An AI that responds in under 60 seconds fixes it.</span>
        </p>
      </div>
    ),
  },

  // 4 ── WHAT IS KYRA ────────────────────────────────────────────────────────
  {
    id: 'platform',
    bg: 'from-slate-950 to-indigo-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-7">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">The Platform</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            Kyra is a white-label<br />
            <span className="text-indigo-400">AI workforce platform.</span>
          </h2>
          <p className="text-slate-400 mt-3 text-sm max-w-2xl">
            Built on OpenClaw — an open-source autonomous AI runtime. You get a dashboard
            to deploy and manage AI workers for each client, all under your own brand.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FeatureRow
            icon={Bot}
            title="One AI worker per client"
            desc="Each client gets a dedicated AI configured with their business — services, hours, prices, tone, and knowledge. Not a shared chatbot."
            color="text-indigo-400"
          />
          <FeatureRow
            icon={Layers}
            title="AI Teams (new)"
            desc="Deploy a team of specialist AIs per client: a front-desk receptionist routes to an appointment setter, sales qualifier, or objection handler based on what the lead says."
            color="text-violet-400"
          />
          <FeatureRow
            icon={Globe}
            title="Multi-channel, one AI brain"
            desc="SMS (via GHL), web chat widget, Telegram, WhatsApp, voice calls — the same AI handles all channels simultaneously."
            color="text-emerald-400"
          />
          <FeatureRow
            icon={Shield}
            title="White-label — your brand"
            desc="Your logo, your colors, your company name on the dashboard, client portals, and chat widget. Clients see your agency, not Kyra."
            color="text-amber-400"
          />
        </div>
      </div>
    ),
  },

  // 5 ── WHAT THE AI DOES ────────────────────────────────────────────────────
  {
    id: 'capabilities',
    bg: 'from-slate-950 via-slate-900 to-indigo-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-6">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">What the AI Actually Does</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            A 24/7 employee<br />
            <span className="text-emerald-400">without the payroll.</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { emoji: '💬', title: 'Responds in < 60 seconds', desc: 'Every inbound SMS, web chat, Telegram, or WhatsApp message' },
            { emoji: '📅', title: 'Books appointments', desc: 'Checks GHL calendar availability, books and sends confirmations' },
            { emoji: '🏷️', title: 'Qualifies & tags leads', desc: 'Asks the right questions, scores interest, tags hot prospects in GHL CRM' },
            { emoji: '📋', title: 'Updates the CRM', desc: 'Creates contacts, logs every conversation, moves deals through the pipeline' },
            { emoji: '📞', title: 'Answers phone calls', desc: 'Picks up, converses naturally via voice AI, logs transcript to CRM' },
            { emoji: '🚨', title: 'Escalates when needed', desc: 'Flags complex requests or upset customers to a real human instantly' },
            { emoji: '🌐', title: 'Reads the internet', desc: 'Web Intelligence (Pro+) lets the AI browse live for competitor pricing, leads, news' },
            { emoji: '🔄', title: 'Follows up automatically', desc: 'Triggers GHL workflow sequences for leads that don\'t respond' },
            { emoji: '📊', title: 'Full conversation history', desc: 'Every message, lead, and outcome tracked in your dashboard' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/8 rounded-xl p-4">
              <span className="text-2xl">{emoji}</span>
              <p className="text-white font-semibold text-xs mt-2 mb-1">{title}</p>
              <p className="text-slate-500 text-xs leading-snug">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs text-center">
          Powered by Claude (Anthropic), GPT-4o (OpenAI), and Gemini — auto-routed based on message complexity.
          Agencies can bring their own API key (BYOK) to control costs.
        </p>
      </div>
    ),
  },

  // 6 ── AI TEAMS (new feature) ──────────────────────────────────────────────
  {
    id: 'ai-teams',
    bg: 'from-violet-950/50 via-slate-950 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-7">
        <div>
          <div className="inline-flex items-center gap-2 bg-violet-500/15 border border-violet-500/25 rounded-full px-3 py-1 text-xs font-semibold text-violet-300 mb-4">
            <Zap className="h-3 w-3" /> New — AI Teams
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            Not one AI.<br />
            <span className="text-violet-400">A whole team of them.</span>
          </h2>
          <p className="text-slate-400 mt-3 text-sm max-w-2xl">
            Deploy multiple specialist AI workers per client that hand off between each other
            based on what the customer says — no coding or configuration beyond clicking a template.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { emoji: '📞', name: 'Appointment Setter', desc: 'Triggers on "book", "schedule", "availability" keywords — checks GHL calendar and confirms' },
            { emoji: '🎯', name: 'Sales Qualifier', desc: 'Triggers on pricing and interest questions — scores lead, creates opportunity in GHL' },
            { emoji: '🗣️', name: 'Objection Handler', desc: 'Activates when hesitation is detected — trained responses for common objections' },
            { emoji: '⭐', name: 'Review Responder', desc: 'Monitors for feedback mentions — drafts and sends professional responses' },
            { emoji: '🛒', name: 'Abandoned Cart', desc: 'E-commerce: detects cart abandonment and re-engages automatically' },
            { emoji: '📊', name: 'Pipeline Tracker', desc: 'Background worker: monitors GHL deals and alerts on stale opportunities' },
          ].map(({ emoji, name, desc }) => (
            <div key={name} className="flex gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
              <span className="text-xl shrink-0">{emoji}</span>
              <div>
                <p className="text-white font-semibold text-xs mb-1">{name}</p>
                <p className="text-slate-500 text-xs leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs">
          30+ specialist worker roles. Pre-built team templates: Full-Service Front Desk, Sales Machine,
          Real Estate Team, E-Commerce Support, Agency Operations. Available on Lite plan and above.
        </p>
      </div>
    ),
  },

  // 7 ── 50+ TEMPLATES ───────────────────────────────────────────────────────
  {
    id: 'templates',
    bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-6">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">Industry Templates</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            50+ industries.<br />
            <span className="text-indigo-400">Deploy in under 3 minutes.</span>
          </h2>
          <p className="text-slate-400 mt-3 text-sm">
            Every template includes a pre-built AI personality, greeting, instructions, and GHL integration config.
            No customization required — though you can edit everything.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            'Dental','Real Estate','Law Firm','HVAC','Auto Repair','Gym & Fitness',
            'Restaurant','Med Spa','Insurance','Veterinary','Salon','Roofing',
            'Cannabis Dispensary','Moving Company','Plumbing','Accounting',
            'Chiropractic','Mental Health','Mortgage','Property Management',
            'Pest Control','Solar','Wedding Planning','Physical Therapy',
            'Childcare','Senior Care','E-Commerce','Staffing','Yoga','Catering',
            '+ 20 more',
          ].map((ind) => (
            <span key={ind} className={`rounded-full px-3 py-1 text-xs font-medium border ${
              ind.startsWith('+')
                ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10'
                : 'border-white/10 text-slate-300 bg-white/5'
            }`}>{ind}</span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { n: '1', label: 'Pick template', time: '~30 sec' },
            { n: '2', label: 'Connect GHL + channels', time: '~2 min' },
            { n: '3', label: 'AI goes live', time: 'Instant' },
          ].map(({ n, label, time }) => (
            <div key={n} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm mx-auto mb-2">{n}</div>
              <p className="text-white font-semibold text-xs">{label}</p>
              <p className="text-indigo-400 text-xs mt-1">{time}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 8 ── BUSINESS MODEL ──────────────────────────────────────────────────────
  {
    id: 'business-model',
    bg: 'from-slate-950 via-emerald-950/20 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-6">
        <div>
          <p className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-3">The Business Model</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            You set your price.<br />
            <span className="text-emerald-400">You keep the margin.</span>
          </h2>
          <p className="text-slate-400 mt-2 text-sm">
            Kyra is your platform cost. What you charge clients is entirely up to you.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-slate-400 text-xs mb-5 font-semibold uppercase tracking-wider">Real math — Pro plan, 10 clients</p>
          <div className="grid grid-cols-3 gap-4 text-center mb-5">
            <div>
              <p className="text-slate-500 text-xs mb-1">You pay Kyra</p>
              <p className="text-3xl font-black text-white">$299<span className="text-sm text-slate-500">/mo</span></p>
              <p className="text-slate-600 text-xs mt-1">Pro plan · up to 11 clients</p>
            </div>
            <div className="flex items-center justify-center text-slate-600 text-3xl font-black">→</div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Market rate to charge</p>
              <p className="text-3xl font-black text-emerald-400">$297–997<span className="text-sm text-emerald-700">/mo each</span></p>
              <p className="text-slate-600 text-xs mt-1">GHL white-label agencies commonly charge $297–$997/mo</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-4 grid grid-cols-3 gap-3">
            <div className="text-center bg-white/5 rounded-xl p-3">
              <p className="text-slate-500 text-xs mb-1">Your cost per client</p>
              <p className="text-2xl font-black text-white">~$27</p>
              <p className="text-slate-600 text-xs mt-1">$299 ÷ 11</p>
            </div>
            <div className="text-center bg-white/5 rounded-xl p-3">
              <p className="text-slate-500 text-xs mb-1">Conservative charge</p>
              <p className="text-2xl font-black text-white">$497/mo</p>
              <p className="text-slate-600 text-xs mt-1">per client</p>
            </div>
            <div className="text-center bg-emerald-500 rounded-xl p-3">
              <p className="text-emerald-100 text-xs mb-1">Your margin (10 clients)</p>
              <p className="text-2xl font-black text-white">$4,671</p>
              <p className="text-emerald-100 text-xs mt-1">per month recurring</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-white font-semibold text-sm mb-1">Annual pricing available</p>
            <p className="text-slate-400 text-xs">Pro annual = $239/mo ($720 savings/yr). Offer annual plans to your clients for upfront cash.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-white font-semibold text-sm mb-1">BYOK = lower costs</p>
            <p className="text-slate-400 text-xs">Clients with their own OpenAI key bypass platform credits — your per-client cost drops even further.</p>
          </div>
        </div>

        <p className="text-slate-600 text-xs">
          * Revenue estimates based on current market rates for GHL white-label AI agency services. Your results depend on your sales, pricing, and client retention. Kyra does not guarantee income.
        </p>
      </div>
    ),
  },

  // 9 ── KYRA PLANS ──────────────────────────────────────────────────────────
  {
    id: 'pricing',
    bg: 'from-indigo-950 via-slate-900 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-10 h-full max-w-5xl mx-auto gap-6">
        <div className="text-center">
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-2">Kyra Plans</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Your platform cost.</h2>
          <p className="text-slate-400 text-sm mt-1">Start free. Upgrade when clients come in.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              name: 'Free', price: '$0', clients: '1 client', monthly: null, highlight: false,
              features: ['1 AI worker', '50 welcome credits', 'All channels (SMS, web chat, Telegram)', 'GHL integration', 'Full CRM', 'No credit card'],
              cta: 'Start Free',
            },
            {
              name: 'Lite', price: '$99', clients: '4 clients', monthly: '$79/mo annual', highlight: false,
              features: ['4 AI workers', '10,000 credits/mo', '500 web scrapes/mo', 'AI Teams (2 specialists)', '50+ templates', 'Escalation alerts', 'Weekly reports'],
              cta: 'Start Lite',
            },
            {
              name: 'Pro', price: '$299', clients: '11 clients', monthly: '$239/mo annual', highlight: true,
              features: ['11 AI workers', '25,000 credits/mo', '2,000 web scrapes/mo', 'AI Teams (4 specialists)', 'White-label branding', 'Lead discovery & enrichment', 'Revenue tracking', 'Review queue'],
              cta: 'Start Pro',
            },
            {
              name: 'Scale', price: '$499', clients: '21 clients', monthly: '$399/mo annual', highlight: false,
              features: ['21 AI workers', '50,000 credits/mo', '5,000 web scrapes/mo', 'AI Teams (6 specialists)', 'Dedicated infrastructure', 'Custom domain', 'SLA uptime guarantee', 'API access'],
              cta: 'Start Scale',
            },
          ].map(({ name, price, clients, monthly, highlight, features, cta }) => (
            <div key={name} className={`rounded-2xl p-4 flex flex-col ${
              highlight
                ? 'bg-white text-gray-900 ring-2 ring-indigo-400 shadow-xl shadow-indigo-500/20'
                : 'bg-white/8 border border-white/10 text-white'
            }`}>
              {highlight && (
                <div className="text-center mb-2">
                  <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">MOST POPULAR</span>
                </div>
              )}
              <p className={`font-bold text-sm ${highlight ? 'text-gray-900' : 'text-white'}`}>{name}</p>
              <p className={`text-3xl font-black mt-1 ${highlight ? 'text-gray-900' : 'text-white'}`}>{price}<span className={`text-xs font-normal ${highlight ? 'text-gray-500' : 'text-slate-400'}`}>/mo</span></p>
              <p className={`text-xs mt-0.5 mb-1 font-semibold ${highlight ? 'text-indigo-600' : 'text-indigo-400'}`}>{clients}</p>
              {monthly && <p className={`text-xs mb-3 ${highlight ? 'text-gray-400' : 'text-slate-600'}`}>{monthly}</p>}
              <ul className="space-y-1.5 flex-1 mb-4 mt-2">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-xs">
                    <CheckCircle2 className={`h-3 w-3 mt-0.5 shrink-0 ${highlight ? 'text-emerald-500' : 'text-indigo-400'}`} />
                    <span className={highlight ? 'text-gray-600' : 'text-slate-400'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup/agency" className={`block text-center text-xs font-bold py-2.5 rounded-xl transition ${
                highlight ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
              }`}>{cta}</Link>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs text-center">
          Voice AI add-on: +$79/mo · 300 minutes of inbound + outbound AI calling · Works with any plan.
          All plans include: multi-channel AI, CRM, GHL integration, conversation inbox. Cancel anytime.
        </p>
      </div>
    ),
  },

  // 10 ── WHO THIS IS FOR ────────────────────────────────────────────────────
  {
    id: 'who',
    bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-8">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">Who This Is For</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            No technical background<br />
            <span className="text-indigo-400">required.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Briefcase, title: 'Marketing agencies', desc: 'Add AI workers to your service stack. Upsell existing clients or use Kyra as a standalone offer. White-label under your brand.' },
            { icon: Users, title: 'Coaches & consultants', desc: 'Help your clients implement AI without building anything yourself. Kyra handles the setup; you handle the strategy and relationship.' },
            { icon: Target, title: 'Work-from-home entrepreneurs', desc: 'Start on the free plan, land a local business as your first client, grow from there. Low overhead, location-independent.' },
            { icon: BarChart3, title: 'Digital marketing freelancers', desc: 'Add monthly recurring revenue to project-based work. One AI client retainer is typically worth 3–4 one-off website projects.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-5">
              <div className="bg-emerald-500/10 rounded-xl p-3 h-fit shrink-0">
                <Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-amber-900/20 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-amber-300 font-semibold text-sm mb-1">What you actually need to start</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            The ability to have a 30-minute conversation with a business owner, demonstrate the AI live,
            and follow up. Kyra handles the technology. You handle the relationship.
          </p>
        </div>
      </div>
    ),
  },

  // 11 ── YOUR DASHBOARD ─────────────────────────────────────────────────────
  {
    id: 'dashboard',
    bg: 'from-indigo-950 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-8">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">Your Dashboard</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            One login.<br />
            <span className="text-indigo-400">Every client's AI.</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { emoji: '🤖', title: 'AI Worker per client', desc: 'Configure, monitor, and update each client\'s AI from one place' },
            { emoji: '💬', title: 'Conversation inbox', desc: 'Read every message the AI sends and receives across all channels' },
            { emoji: '📊', title: 'Analytics & reporting', desc: 'Response times, lead counts, conversion rates — per client' },
            { emoji: '🔗', title: 'GHL integration', desc: 'Connect contacts, calendar, pipeline, and workflows per client' },
            { emoji: '🏷️', title: 'White-label branding', desc: 'Your logo, name, colors. Client portal shows your brand.' },
            { emoji: '🌐', title: 'Website builder', desc: 'Generate 15–25 page SEO sites for clients from the same dashboard' },
            { emoji: '📱', title: 'Multi-channel AI', desc: 'SMS, web chat, Telegram, WhatsApp, voice — one AI, all channels' },
            { emoji: '🛠️', title: 'Skills & integrations', desc: 'Web search, PDF analysis, image AI, Google Workspace, and more' },
            { emoji: '👥', title: 'Referral program', desc: 'Earn 100–150 credits per referral. Early bird bonus within 48 hrs.' },
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

  // 12 ── HOW TO START ───────────────────────────────────────────────────────
  {
    id: 'start',
    bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-7">
        <div>
          <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-3">Getting Started</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            First paying client<br />
            <span className="text-emerald-400">is closer than you think.</span>
          </h2>
        </div>
        <div className="space-y-3">
          {[
            {
              n: '01', title: 'Create your free account', tag: 'Today', tagColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
              desc: 'Free plan includes 1 AI worker + 50 credits. No credit card. You\'ll have a live dashboard in minutes.',
            },
            {
              n: '02', title: 'Build a demo for a target industry', tag: 'Day 1', tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
              desc: 'Pick a template (dental, HVAC, real estate — whatever you know). Configure it. Share the live demo link — the prospect can text the AI without logging in.',
            },
            {
              n: '03', title: 'Reach out to local businesses', tag: 'Week 1–2', tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
              desc: 'Show the demo live in a meeting or share the link. Ask: "How many leads do you lose because nobody answered in time?" Close on a monthly retainer.',
            },
            {
              n: '04', title: 'Upgrade and scale', tag: 'Month 1+', tagColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
              desc: 'Once you have 2–3 paying clients, upgrade to Lite ($99/mo). Add clients until you hit Pro. The AI runs itself — your time per client drops to 30 min/month.',
            },
          ].map(({ n, title, tag, tagColor, desc }) => (
            <div key={n} className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 mt-0.5">{n}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
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

  // 13 ── THE HONEST SLIDE ───────────────────────────────────────────────────
  {
    id: 'honest',
    bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-4xl mx-auto gap-7 text-center">
        <div>
          <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3">The Honest Part</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            Real opportunity.<br />
            <span className="text-amber-400">Real work required.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="bg-emerald-900/15 border border-emerald-500/20 rounded-2xl p-5">
            <p className="text-emerald-400 font-semibold text-sm mb-3">✅ What's genuinely true</p>
            <ul className="space-y-2">
              {[
                'The platform works — AI responds to leads in real-time',
                'GHL agencies commonly charge $297–$997/mo per client',
                'Recurring revenue compounds as you add clients',
                'The AI handles the day-to-day work once configured',
                'You can start for free and upgrade as you earn',
                'The small business AI market is early and growing',
              ].map(item => (
                <li key={item} className="text-slate-300 text-xs flex gap-2 leading-snug">
                  <span className="text-emerald-400 shrink-0">·</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-amber-900/15 border border-amber-500/20 rounded-2xl p-5">
            <p className="text-amber-400 font-semibold text-sm mb-3">⚠️ What takes effort</p>
            <ul className="space-y-2">
              {[
                'You have to find and close clients yourself',
                'Results depend on your sales effort and follow-through',
                'This is a service business — not fully passive income',
                'It takes weeks to build a portfolio of paying clients',
                'No platform can guarantee a specific income level',
                'Client retention depends on real results for their business',
              ].map(item => (
                <li key={item} className="text-slate-300 text-xs flex gap-2 leading-snug">
                  <span className="text-amber-400 shrink-0">·</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-slate-600 text-xs max-w-xl mx-auto">
          Kyra is a software platform. Your success depends on your effort, your market, and the value you deliver to clients.
          We give you the best tools we can build — what you create with them is up to you.
        </p>
      </div>
    ),
  },

  // 14 ── CTA ────────────────────────────────────────────────────────────────
  {
    id: 'cta',
    bg: 'from-indigo-950 via-indigo-900 to-slate-950',
    content: (
      <div className="flex flex-col items-center justify-center text-center px-6 sm:px-12 h-full gap-8">
        <Award className="h-14 w-14 text-indigo-400" />
        <div>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] max-w-3xl">
            Start building<br />
            <span className="text-indigo-400">your AI agency.</span>
          </h2>
          <p className="text-slate-300 text-lg mt-4 max-w-xl mx-auto leading-relaxed">
            Free plan. No credit card. First AI worker live in under 10 minutes.
            Everything else grows from there.
          </p>
        </div>
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
            Live AI Demo
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-2 text-slate-400 text-sm">
          {[
            { icon: CheckCircle2, text: 'Free to start' },
            { icon: CheckCircle2, text: 'No credit card' },
            { icon: CheckCircle2, text: 'Cancel anytime' },
            { icon: CheckCircle2, text: '50+ templates' },
            { icon: CheckCircle2, text: 'GHL integration included' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="h-4 w-4 text-indigo-400" />
              {text}
            </div>
          ))}
        </div>
        <p className="text-slate-700 text-xs max-w-lg">
          kyra.conversionsystem.com · Built on OpenClaw · Questions? support@conversionsystem.com
        </p>
      </div>
    ),
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AIAgencyPitch() {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(SLIDES.length - 1, c + 1)), []);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'Space'].includes(e.key)) next();
      if (['ArrowLeft', 'ArrowUp'].includes(e.key)) prev();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [next, prev]);

  // Touch / swipe
  useEffect(() => {
    let sx = 0;
    const ts = (e: TouchEvent) => { sx = e.touches[0].clientX; };
    const te = (e: TouchEvent) => {
      const dx = sx - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 50) dx > 0 ? next() : prev();
    };
    window.addEventListener('touchstart', ts);
    window.addEventListener('touchend', te);
    return () => { window.removeEventListener('touchstart', ts); window.removeEventListener('touchend', te); };
  }, [next, prev]);

  const slide = SLIDES[current];

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden">
      {/* Slide background + content */}
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.bg} transition-all duration-500`}>
        <div className="absolute inset-0 overflow-y-auto">
          <div className="min-h-full py-16">
            {slide.content}
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-black/25 backdrop-blur-sm z-10">
        <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition text-sm font-semibold">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-black text-xs">K</div>
          Kyra
        </Link>
        <span className="text-white/40 text-xs font-medium">{current + 1} / {SLIDES.length}</span>
        <Link href="/signup/agency" className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition">
          Start Free →
        </Link>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-8 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/50'}`}
          />
        ))}
      </div>

      {/* Arrow nav */}
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
