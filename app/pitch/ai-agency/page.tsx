'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, ArrowRight, DollarSign,
  Users, Zap, Bot, MessageSquare, CheckCircle2, Clock, Globe,
  Shield, BarChart3, Sparkles, Briefcase, Award, Play,
  Phone, Layers, Target, ChevronDown, TrendingUp,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Text scale convention for this deck:
//   slide heading  → text-4xl/5xl/6xl font-black
//   sub-heading    → text-xl/2xl font-bold
//   body / labels  → text-base (16px) — MINIMUM for readability
//   small detail   → text-sm (14px)  — used sparingly
//   captions       → text-xs (12px)  — disclaimers only
// Colors: white / text-slate-200 for body, accent for highlights
// ─────────────────────────────────────────────────────────────────────────────

function Pill({ children, color = 'slate' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    indigo: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
    emerald: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
    amber: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
    violet: 'bg-violet-500/20 text-violet-200 border-violet-400/30',
    slate: 'bg-white/10 text-slate-200 border-white/15',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${map[color] ?? map.slate}`}>
      {children}
    </span>
  );
}

function SlideStat({ stat, label, sub, accent }: { stat: string; label: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 text-center ${accent ? 'bg-emerald-500' : 'bg-white/8 border border-white/12'}`}>
      <p className={`text-4xl sm:text-5xl font-black ${accent ? 'text-white' : 'text-emerald-400'}`}>{stat}</p>
      <p className={`text-base font-semibold mt-2 leading-snug ${accent ? 'text-white' : 'text-white'}`}>{label}</p>
      {sub && <p className={`text-sm mt-1 ${accent ? 'text-emerald-100' : 'text-slate-300'}`}>{sub}</p>}
    </div>
  );
}

function FRow({ icon: Icon, title, desc, color }: { icon: React.ElementType; title: string; desc: string; color: string }) {
  const bg = color.replace('text-', 'bg-').replace('-300', '-500/10').replace('-400', '-500/10');
  return (
    <div className="flex gap-4 bg-white/6 border border-white/12 rounded-2xl p-5">
      <div className={`rounded-xl p-3 h-fit shrink-0 ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-white font-bold text-base mb-1">{title}</p>
        <p className="text-slate-200 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function Grid9({ items }: { items: { emoji: string; title: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map(({ emoji, title, desc }) => (
        <div key={title} className="bg-white/6 border border-white/10 rounded-xl p-4">
          <span className="text-2xl">{emoji}</span>
          <p className="text-white font-bold text-sm mt-2 mb-1">{title}</p>
          <p className="text-slate-200 text-sm leading-snug">{desc}</p>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDES
// ═════════════════════════════════════════════════════════════════════════════

const SLIDES = [

  // ── 1 · HOOK ──────────────────────────────────────────────────────────────
  {
    id: 'hook', bg: 'from-slate-950 via-indigo-950 to-slate-950',
    content: (
      <div className="flex flex-col items-center justify-center text-center px-6 sm:px-16 h-full gap-6">
        <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-5 py-2 text-sm font-semibold text-white/80">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          Build a real AI agency — powered by OpenClaw
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] max-w-4xl">
          The AI agency<br />
          <span className="text-indigo-400">opportunity is open.</span>
        </h1>
        <p className="text-xl sm:text-2xl text-slate-200 max-w-2xl leading-relaxed">
          Small businesses everywhere need AI — and don't know where to start.
          Kyra gives you the platform, the tools, and the system to be the person they hire.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <Pill color="emerald">✓ Start free — no credit card</Pill>
          <Pill color="indigo">✓ 50+ industry templates</Pill>
          <Pill color="amber">✓ Work from anywhere</Pill>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm mt-4 animate-bounce">
          <ChevronDown className="h-4 w-4" /> Arrow keys or swipe to navigate
        </div>
      </div>
    ),
  },

  // ── 2 · THE MARKET ────────────────────────────────────────────────────────
  {
    id: 'market', bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-7">
        <div>
          <p className="text-indigo-400 font-bold text-sm uppercase tracking-wider mb-3">The Market Right Now</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            AI adoption is exploding.<br />
            <span className="text-indigo-400">Service businesses lag behind.</span>
          </h2>
          <p className="text-slate-200 mt-3 text-base max-w-2xl leading-relaxed">
            According to the U.S. Small Business Administration (2025), only about 6% of small businesses
            are actively using AI — vs 11% of large enterprises. That gap is the market.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SlideStat stat="33M+" label="Small businesses in the US" sub="All potential clients" />
          <SlideStat stat="~6%" label="Using AI actively" sub="SBA Report, 2025" />
          <SlideStat stat="58%" label="Save 20+ hrs/mo once they start" sub="USM Systems, 2025" />
          <SlideStat stat="$297B+" label="Global AI market, 2026" sub="Industry projection" accent />
        </div>
        <div className="bg-indigo-900/40 border border-indigo-500/25 rounded-2xl p-5">
          <p className="text-white font-bold text-base mb-2">Why service businesses specifically</p>
          <p className="text-slate-200 text-base leading-relaxed">
            Dentists, HVAC companies, law firms, salons — they can't hire a 24/7 receptionist.
            They miss leads when they're on a job. A well-configured AI worker solves exactly that,
            at a fraction of the cost of an employee. And they're happy to pay monthly for it.
          </p>
        </div>
      </div>
    ),
  },

  // ── 3 · THE PROBLEM ───────────────────────────────────────────────────────
  {
    id: 'problem', bg: 'from-slate-950 via-rose-950/20 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-7">
        <div>
          <p className="text-rose-400 font-bold text-sm uppercase tracking-wider mb-3">The Problem You Solve</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Slow response = lost revenue.<br />
            <span className="text-rose-400">Every single day.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Clock, stat: '78%', detail: 'of leads convert to the first business that responds', src: 'MIT / InsideSales.com', color: 'text-rose-400' },
            { icon: MessageSquare, stat: '5 min', detail: 'After 5 minutes, lead conversion drops 80%', src: 'Harvard Business Review', color: 'text-amber-400' },
            { icon: Phone, stat: '62%', detail: 'of calls to small businesses go unanswered', src: 'BIA Advisory Services', color: 'text-rose-400' },
            { icon: DollarSign, stat: '$0', detail: 'Revenue from a qualified lead that gets no reply', src: '', color: 'text-slate-400' },
          ].map(({ icon: Icon, stat, detail, src, color }) => (
            <div key={stat+detail} className="flex items-start gap-4 bg-white/6 border border-white/12 rounded-2xl p-5">
              <div className="bg-white/10 rounded-xl p-3 shrink-0">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className={`text-3xl font-black ${color}`}>{stat}</p>
                <p className="text-white text-base leading-snug mt-1">{detail}</p>
                {src && <p className="text-slate-400 text-sm mt-1">Source: {src}</p>}
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-200 text-base">
          Plumbers, dentists, gyms, law firms, real estate agents — this is universal.
          <span className="text-white font-bold"> An AI that responds in under 60 seconds fixes it.</span>
        </p>
      </div>
    ),
  },

  // ── 4 · OPENCLAW — THE REAL DIFFERENTIATOR ────────────────────────────────
  {
    id: 'openclaw', bg: 'from-indigo-950 via-violet-950/40 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-7">
        <div>
          <p className="text-violet-400 font-bold text-sm uppercase tracking-wider mb-3">The Technology Behind Kyra</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Every client gets their own<br />
            <span className="text-violet-400">dedicated AI container.</span>
          </h2>
          <p className="text-slate-200 mt-3 text-base max-w-2xl leading-relaxed">
            Kyra is built on <strong className="text-white">OpenClaw</strong> — a leading open-source autonomous AI agent platform,
            trusted by thousands of developers and businesses worldwide. This isn't a shared chatbot.
            Each client runs in their own isolated environment.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { emoji: '🔒', title: 'Per-client isolation', desc: 'Each business gets their own OpenClaw container with dedicated memory, knowledge, and conversation history. Completely separate from other clients.' },
            { emoji: '🧠', title: 'Persistent AI memory', desc: 'The AI remembers every interaction, learns the business over time, and improves its responses. Not a stateless chatbot that forgets everything.' },
            { emoji: '🛠️', title: 'Extensible via Skills', desc: 'Each AI worker can be given additional skills: web search, PDF analysis, Google Workspace, image AI, email — like giving your employee new capabilities.' },
            { emoji: '💻', title: 'OpenClaw Terminal access', desc: 'Agency owners get direct terminal access to their AI\'s environment. Advanced configuration, custom workflows, and full transparency over what the AI is doing.' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="flex gap-4 bg-white/6 border border-violet-500/20 rounded-2xl p-5">
              <span className="text-2xl shrink-0 mt-0.5">{emoji}</span>
              <div>
                <p className="text-white font-bold text-base mb-1">{title}</p>
                <p className="text-slate-200 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-violet-900/30 border border-violet-500/25 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-3xl shrink-0">🦞</span>
          <p className="text-slate-200 text-sm leading-relaxed">
            <span className="text-white font-bold">Why this matters for your agency:</span> Your clients get
            enterprise-grade AI infrastructure that adapts and improves — not a generic chatbot
            anyone can copy. OpenClaw's architecture is what makes the AI actually autonomous.
          </p>
        </div>
      </div>
    ),
  },

  // ── 5 · WHAT KYRA GIVES YOU ───────────────────────────────────────────────
  {
    id: 'platform', bg: 'from-slate-950 to-indigo-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-7">
        <div>
          <p className="text-indigo-400 font-bold text-sm uppercase tracking-wider mb-3">The Platform</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Website. AI Worker. CRM.<br />
            <span className="text-indigo-400">All from one dashboard.</span>
          </h2>
          <p className="text-slate-200 mt-3 text-base">
            Every client you onboard gets three things at once — not just a chatbot.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              emoji: '🌐', color: 'border-emerald-500/30 bg-emerald-900/15',
              title: 'AI Website Builder',
              items: ['15–25 SEO-optimized pages', 'Service pages, city pages, blog, FAQ', 'Built for search engines in minutes', 'Growth Engine adds new pages over time'],
            },
            {
              emoji: '🤖', color: 'border-indigo-500/30 bg-indigo-900/15',
              title: 'AI Worker (OpenClaw)',
              items: ['Responds to every lead in < 60 sec', 'SMS, web chat, Telegram, WhatsApp, voice', 'Books appointments in GHL calendar', 'AI Teams with specialist workers'],
            },
            {
              emoji: '📊', color: 'border-violet-500/30 bg-violet-900/15',
              title: 'Built-In CRM',
              items: ['Contacts, companies, deals, pipeline', 'Every lead auto-created from any channel', 'Full conversation history per contact', 'GHL integration syncs everything'],
            },
          ].map(({ emoji, color, title, items }) => (
            <div key={title} className={`rounded-2xl p-5 border ${color}`}>
              <span className="text-3xl">{emoji}</span>
              <p className="text-white font-bold text-base mt-3 mb-3">{title}</p>
              <ul className="space-y-2">
                {items.map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-slate-200 text-base">
            White-label everything — <span className="text-white font-bold">your logo, your colors, your brand</span> on the dashboard, client portal, chat widget, and generated websites.
          </p>
        </div>
      </div>
    ),
  },

  // ── 6 · WHAT THE AI ACTUALLY DOES ────────────────────────────────────────
  {
    id: 'capabilities', bg: 'from-slate-950 via-slate-900 to-indigo-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-6">
        <div>
          <p className="text-indigo-400 font-bold text-sm uppercase tracking-wider mb-3">What the AI Worker Does</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            A 24/7 employee.<br />
            <span className="text-emerald-400">Without the payroll.</span>
          </h2>
        </div>
        <Grid9 items={[
          { emoji: '💬', title: 'Responds in < 60 seconds', desc: 'Every SMS, web chat, Telegram, or WhatsApp message — never misses a lead' },
          { emoji: '📅', title: 'Books appointments', desc: 'Checks GHL calendar live, books the slot, sends confirmation — no human needed' },
          { emoji: '🏷️', title: 'Qualifies & tags leads', desc: 'Asks the right questions, scores intent, tags hot prospects in GHL CRM' },
          { emoji: '📋', title: 'Updates the CRM', desc: 'Creates contacts, logs every conversation, moves deals through the pipeline' },
          { emoji: '📞', title: 'Answers phone calls', desc: 'Voice AI picks up, has a natural conversation, logs full transcript to CRM' },
          { emoji: '🌍', title: 'Reads the web live', desc: 'Web Intelligence (Pro+) lets the AI browse for competitor pricing, leads, news' },
          { emoji: '🚨', title: 'Escalates when needed', desc: 'Flags complex issues to a human — no frustrated customers falling through' },
          { emoji: '🔄', title: 'Follows up automatically', desc: 'Triggers GHL workflow sequences for leads that don\'t respond initially' },
          { emoji: '📊', title: 'Full transparency', desc: 'Every message, lead, and outcome tracked in your agency dashboard' },
        ]} />
        <p className="text-slate-300 text-sm text-center">
          Powered by Claude (Anthropic), GPT-4o (OpenAI), and Gemini — auto-routed by complexity. Agencies can bring their own API key (BYOK).
        </p>
      </div>
    ),
  },

  // ── 7 · AI TEAMS ─────────────────────────────────────────────────────────
  {
    id: 'ai-teams', bg: 'from-violet-950/50 via-slate-950 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-7">
        <div>
          <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-400/30 rounded-full px-4 py-1.5 text-sm font-bold text-violet-200 mb-4">
            <Zap className="h-3.5 w-3.5" /> Recently shipped — AI Teams
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Not one AI.<br />
            <span className="text-violet-400">A whole team of specialists.</span>
          </h2>
          <p className="text-slate-200 mt-3 text-base max-w-2xl leading-relaxed">
            Deploy multiple AI workers per client that hand off between each other based on
            what the customer says. Automatically. No coding.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { emoji: '📞', name: 'Appointment Setter', desc: 'Triggers on booking intent — checks GHL calendar and confirms' },
            { emoji: '🎯', name: 'Sales Qualifier', desc: 'Triggers on pricing questions — scores lead, creates opportunity' },
            { emoji: '🗣️', name: 'Objection Handler', desc: 'Activates on hesitation — responds with trained objection scripts' },
            { emoji: '⭐', name: 'Review Responder', desc: 'Handles feedback mentions — drafts professional responses' },
            { emoji: '🛒', name: 'Abandoned Cart', desc: 'E-commerce: detects cart abandonment and re-engages' },
            { emoji: '📊', name: 'Pipeline Tracker', desc: 'Background: monitors GHL deals, alerts on stale opportunities' },
          ].map(({ emoji, name, desc }) => (
            <div key={name} className="flex gap-3 bg-white/6 border border-white/12 rounded-xl p-4">
              <span className="text-xl shrink-0">{emoji}</span>
              <div>
                <p className="text-white font-bold text-sm mb-1">{name}</p>
                <p className="text-slate-200 text-sm leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Full-Service Front Desk', 'Sales Machine', 'Real Estate Team', 'E-Commerce Support'].map(t => (
            <div key={t} className="bg-violet-900/20 border border-violet-500/20 rounded-xl px-3 py-2 text-center">
              <p className="text-violet-200 text-sm font-semibold">{t}</p>
            </div>
          ))}
        </div>
        <p className="text-slate-300 text-sm">30+ specialist worker roles. Pre-built team templates. Available on Lite plan and above.</p>
      </div>
    ),
  },

  // ── 8 · 50+ TEMPLATES ────────────────────────────────────────────────────
  {
    id: 'templates', bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-6">
        <div>
          <p className="text-indigo-400 font-bold text-sm uppercase tracking-wider mb-3">Industry Templates</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            50 industries.<br />
            <span className="text-indigo-400">Live in under 3 minutes.</span>
          </h2>
          <p className="text-slate-200 mt-3 text-base">
            Pre-built AI personality, greeting, instructions, GHL config, and website structure per industry.
            Deploy as-is or customize — everything is editable.
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
            'Electrician','Landscaping','Flooring','Pool Service','Painting',
            'Construction','Automotive Sales','Tattoo & Piercing','Towing','Music Education',
            'Personal Training','Pet Services','Dry Cleaning','Locksmith','Martial Arts',
            'Photography','Tutoring','Travel Agency','Senior Care','+ more',
          ].map((ind, i) => (
            <span key={ind+i} className={`rounded-full px-3 py-1 text-sm font-medium border ${
              ind.startsWith('+')
                ? 'border-indigo-400/40 text-indigo-300 bg-indigo-500/10'
                : 'border-white/12 text-slate-200 bg-white/5'
            }`}>{ind}</span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { n: '1', label: 'Pick template', time: '~30 sec' },
            { n: '2', label: 'Connect GHL + channels', time: '~2 min' },
            { n: '3', label: 'AI goes live', time: 'Instant' },
          ].map(({ n, label, time }) => (
            <div key={n} className="bg-white/6 border border-white/12 rounded-xl p-4 text-center">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm mx-auto mb-2">{n}</div>
              <p className="text-white font-bold text-sm">{label}</p>
              <p className="text-indigo-400 text-sm mt-1">{time}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 9 · BUSINESS MODEL ───────────────────────────────────────────────────
  {
    id: 'business-model', bg: 'from-slate-950 via-emerald-950/20 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-6">
        <div>
          <p className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-3">The Business Model</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            You set your price.<br />
            <span className="text-emerald-400">You keep the margin.</span>
          </h2>
          <p className="text-slate-200 mt-2 text-base">Kyra is your platform cost. What you charge clients is yours to decide.</p>
        </div>
        <div className="bg-white/6 border border-white/12 rounded-2xl p-6">
          <p className="text-slate-300 text-sm mb-4 font-semibold uppercase tracking-wider">Real math — Pro plan, 10 clients</p>
          <div className="grid grid-cols-3 gap-4 text-center mb-5">
            <div>
              <p className="text-slate-300 text-sm mb-1">You pay Kyra</p>
              <p className="text-4xl font-black text-white">$299<span className="text-base text-slate-400">/mo</span></p>
              <p className="text-slate-300 text-sm mt-1">Pro plan · 11 client slots</p>
            </div>
            <div className="flex items-center justify-center text-slate-500 text-3xl font-black">→</div>
            <div>
              <p className="text-slate-300 text-sm mb-1">Market rate to charge</p>
              <p className="text-4xl font-black text-emerald-400">$297–997<span className="text-base text-emerald-600">/mo each</span></p>
              <p className="text-slate-300 text-sm mt-1">GHL agency market standard</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-4 grid grid-cols-3 gap-3">
            <div className="text-center bg-white/5 rounded-xl p-4">
              <p className="text-slate-300 text-sm mb-1">Your cost per client</p>
              <p className="text-3xl font-black text-white">~$27</p>
              <p className="text-slate-300 text-sm mt-1">$299 ÷ 11 clients</p>
            </div>
            <div className="text-center bg-white/5 rounded-xl p-4">
              <p className="text-slate-300 text-sm mb-1">Conservative charge</p>
              <p className="text-3xl font-black text-white">$497/mo</p>
              <p className="text-slate-300 text-sm mt-1">per client</p>
            </div>
            <div className="text-center bg-emerald-500 rounded-xl p-4">
              <p className="text-emerald-100 text-sm mb-1">Your margin (10 clients)</p>
              <p className="text-3xl font-black text-white">$4,671</p>
              <p className="text-emerald-100 text-sm mt-1">per month, recurring</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/12 rounded-xl p-4">
            <p className="text-white font-bold text-base mb-1">Annual pricing available</p>
            <p className="text-slate-200 text-sm">Pro annual = $239/mo (saves $720/yr). Offer annual plans to clients for upfront cash.</p>
          </div>
          <div className="bg-white/5 border border-white/12 rounded-xl p-4">
            <p className="text-white font-bold text-base mb-1">BYOK reduces your costs further</p>
            <p className="text-slate-200 text-sm">Clients with their own OpenAI/Anthropic key bypass platform credits — cost per client drops even more.</p>
          </div>
        </div>
        <p className="text-slate-400 text-xs">* Estimates based on current GHL white-label agency market rates. Income not guaranteed — depends on your sales and client retention.</p>
      </div>
    ),
  },

  // ── 10 · KYRA PLANS ──────────────────────────────────────────────────────
  {
    id: 'pricing', bg: 'from-indigo-950 via-slate-900 to-slate-950',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 h-full max-w-5xl mx-auto gap-6">
        <div className="text-center">
          <p className="text-indigo-400 font-bold text-sm uppercase tracking-wider mb-2">Kyra Plans — Your Platform Cost</p>
          <h2 className="text-4xl font-black text-white">Start free. Scale as you earn.</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              name: 'Free', price: '$0', clients: '1 client', annual: null, highlight: false,
              features: ['1 AI worker (OpenClaw)', '50 welcome credits', 'SMS · web chat · Telegram', 'GHL integration', 'Full CRM', 'No credit card required'],
              cta: 'Start Free',
            },
            {
              name: 'Lite', price: '$99', clients: '4 clients', annual: '$79/mo billed annually', highlight: false,
              features: ['4 AI workers', '10,000 credits/mo', '500 web scrapes/mo', 'AI Teams (2 specialists)', '50+ industry templates', 'Weekly performance reports'],
              cta: 'Start Lite',
            },
            {
              name: 'Pro', price: '$299', clients: '11 clients', annual: '$239/mo billed annually', highlight: true,
              features: ['11 AI workers', '25,000 credits/mo', '2,000 web scrapes/mo', 'AI Teams (4 specialists)', 'White-label branding', 'Lead discovery & enrichment', 'Revenue tracking dashboard'],
              cta: 'Start Pro',
            },
            {
              name: 'Scale', price: '$499', clients: '21 clients', annual: '$399/mo billed annually', highlight: false,
              features: ['21 AI workers', '50,000 credits/mo', '5,000 web scrapes/mo', 'AI Teams (6 specialists)', 'Dedicated infrastructure', 'Custom domain', 'SLA uptime guarantee', 'API access'],
              cta: 'Start Scale',
            },
          ].map(({ name, price, clients, annual, highlight, features, cta }) => (
            <div key={name} className={`rounded-2xl p-4 flex flex-col ${
              highlight ? 'bg-white ring-2 ring-indigo-400 shadow-xl shadow-indigo-500/20' : 'bg-white/8 border border-white/12 text-white'
            }`}>
              {highlight && <div className="text-center mb-2"><span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">MOST POPULAR</span></div>}
              <p className={`font-bold text-sm ${highlight ? 'text-gray-900' : 'text-white'}`}>{name}</p>
              <p className={`text-3xl font-black mt-1 ${highlight ? 'text-gray-900' : 'text-white'}`}>{price}<span className={`text-xs font-normal ${highlight ? 'text-gray-500' : 'text-slate-300'}`}>/mo</span></p>
              <p className={`text-sm font-semibold mt-0.5 mb-1 ${highlight ? 'text-indigo-600' : 'text-indigo-300'}`}>{clients}</p>
              {annual && <p className={`text-xs mb-3 ${highlight ? 'text-gray-400' : 'text-slate-400'}`}>{annual}</p>}
              <ul className="space-y-1.5 flex-1 mb-4 mt-2">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-sm">
                    <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${highlight ? 'text-emerald-500' : 'text-indigo-400'}`} />
                    <span className={highlight ? 'text-gray-600' : 'text-slate-200'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup/agency" className={`block text-center text-sm font-bold py-2.5 rounded-xl transition ${
                highlight ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
              }`}>{cta}</Link>
            </div>
          ))}
        </div>
        <p className="text-slate-300 text-sm text-center">
          Voice AI add-on: +$79/mo · 300 min of AI phone calls (inbound + outbound) · Works with any plan.
          All plans: multi-channel AI, website builder, CRM, GHL integration, conversation inbox.
        </p>
      </div>
    ),
  },

  // ── 11 · WHO THIS IS FOR ─────────────────────────────────────────────────
  {
    id: 'who', bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-7">
        <div>
          <p className="text-indigo-400 font-bold text-sm uppercase tracking-wider mb-3">Who This Is For</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            No technical background<br />
            <span className="text-indigo-400">required.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Briefcase, title: 'Marketing agencies', desc: 'Add AI workers and websites to your service stack. Upsell existing clients or use Kyra as a standalone offer under your brand.' },
            { icon: Users, title: 'Coaches & consultants', desc: 'Help your clients implement AI without building anything yourself. Kyra handles the technology. You handle the strategy and relationship.' },
            { icon: Target, title: 'Work-from-home entrepreneurs', desc: 'Start on the free plan, land a local business as your first client, grow from there. Location-independent, low overhead.' },
            { icon: BarChart3, title: 'Digital marketing freelancers', desc: 'Add recurring monthly revenue to project-based work. One AI client retainer is typically worth 3–4 one-off website projects.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 bg-emerald-900/12 border border-emerald-500/20 rounded-2xl p-5">
              <div className="bg-emerald-500/10 rounded-xl p-3 h-fit shrink-0">
                <Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-bold text-base">{title}</p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-amber-900/20 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-amber-200 font-bold text-base mb-1">What you need to start</p>
          <p className="text-slate-200 text-sm leading-relaxed">
            The ability to have a 30-minute conversation with a business owner, demonstrate the AI live,
            and follow up. Kyra handles the technology. You handle the relationship.
          </p>
        </div>
      </div>
    ),
  },

  // ── 12 · HOW TO START ────────────────────────────────────────────────────
  {
    id: 'start', bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-5xl mx-auto gap-6">
        <div>
          <p className="text-indigo-400 font-bold text-sm uppercase tracking-wider mb-3">Getting Started</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Zero to first<br />
            <span className="text-emerald-400">paying client.</span>
          </h2>
        </div>
        <div className="space-y-3">
          {[
            {
              n: '01', title: 'Create your free account', tag: 'Today', tagColor: 'text-indigo-300 bg-indigo-500/15 border-indigo-400/30',
              desc: 'Free plan — 1 AI worker, 50 credits, no credit card. Live dashboard in minutes. Full access to templates, CRM, and GHL integration.',
            },
            {
              n: '02', title: 'Build a live demo', tag: 'Day 1', tagColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30',
              desc: 'Pick any industry template. Configure a demo AI worker. Share the live demo link — prospects can chat with the AI without logging in. It\'s the most powerful close tool you have.',
            },
            {
              n: '03', title: 'Reach out to local businesses', tag: 'Week 1–2', tagColor: 'text-amber-300 bg-amber-500/15 border-amber-400/30',
              desc: 'Show the demo live. Ask: "How many leads do you lose because nobody answered in time?" The AI answers the question for you. Close on a monthly retainer.',
            },
            {
              n: '04', title: 'Upgrade and scale', tag: 'Month 1+', tagColor: 'text-violet-300 bg-violet-500/15 border-violet-400/30',
              desc: 'Once you have 2–3 paying clients, upgrade to Lite ($99/mo). Each AI worker runs itself — your time per client drops to 30 min/month after onboarding.',
            },
          ].map(({ n, title, tag, tagColor, desc }) => (
            <div key={n} className="flex gap-4 bg-white/5 border border-white/12 rounded-2xl p-4">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 mt-0.5">{n}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <p className="text-white font-bold text-base">{title}</p>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${tagColor}`}>{tag}</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 13 · HONEST SLIDE ────────────────────────────────────────────────────
  {
    id: 'honest', bg: 'from-slate-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-6 sm:px-12 h-full max-w-4xl mx-auto gap-7 text-center">
        <div>
          <p className="text-amber-400 font-bold text-sm uppercase tracking-wider mb-3">The Honest Part</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Real opportunity.<br />
            <span className="text-amber-400">Real effort required.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="bg-emerald-900/15 border border-emerald-500/20 rounded-2xl p-5">
            <p className="text-emerald-300 font-bold text-base mb-3">✅ What's genuinely true</p>
            <ul className="space-y-2.5">
              {[
                'The platform is live and working — AI responds to leads in real-time',
                'GHL agencies commonly charge $297–$997/mo per client today',
                'Recurring revenue compounds significantly as you add clients',
                'The AI handles day-to-day work — your time per client drops after setup',
                'You can start for free and upgrade as you earn',
                'The small business AI adoption gap is real and growing',
              ].map(item => (
                <li key={item} className="text-slate-200 text-sm flex gap-2 leading-snug">
                  <span className="text-emerald-400 shrink-0">·</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-amber-900/15 border border-amber-500/20 rounded-2xl p-5">
            <p className="text-amber-300 font-bold text-base mb-3">⚠️ What takes effort</p>
            <ul className="space-y-2.5">
              {[
                'You have to find and close clients yourself',
                'Results depend entirely on your sales effort and follow-through',
                'This is a managed service business — not fully passive income',
                'Building a portfolio of paying clients takes weeks, not days',
                'No platform can guarantee a specific income level for you',
                'Client retention depends on real AI results for their business',
              ].map(item => (
                <li key={item} className="text-slate-200 text-sm flex gap-2 leading-snug">
                  <span className="text-amber-400 shrink-0">·</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Kyra is a software platform. Your success depends on your effort, your market, and the value you deliver.
          We build the best tools we can — what you create with them is up to you.
        </p>
      </div>
    ),
  },

  // ── 14 · CTA ─────────────────────────────────────────────────────────────
  {
    id: 'cta', bg: 'from-indigo-950 via-indigo-900 to-slate-950',
    content: (
      <div className="flex flex-col items-center justify-center text-center px-6 sm:px-12 h-full gap-8">
        <Award className="h-14 w-14 text-indigo-400" />
        <div>
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] max-w-3xl">
            Start building<br />
            <span className="text-indigo-400">your AI agency.</span>
          </h2>
          <p className="text-slate-200 text-xl mt-5 max-w-xl mx-auto leading-relaxed">
            Free plan. No credit card. First AI worker live in under 10 minutes.
            Everything else grows from there.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup/agency"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-xl px-10 py-4 rounded-2xl shadow-lg shadow-indigo-500/30"
          >
            Start Free <ArrowRight className="h-6 w-6" />
          </Link>
          <Link
            href="/try/dental"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition text-white font-bold text-xl px-10 py-4 rounded-2xl border border-white/20"
          >
            <Play className="h-5 w-5" /> Live AI Demo
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-slate-300 text-base">
          {['Free to start', 'No credit card', 'Cancel anytime', '50+ templates', 'GHL integration', 'OpenClaw-powered'].map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-indigo-400" />
              {t}
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-sm">kyra.conversionsystem.com · Built on OpenClaw · support@conversionsystem.com</p>
      </div>
    ),
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

export default function AIAgencyPitch() {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(SLIDES.length - 1, c + 1)), []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown'].includes(e.key)) next();
      if (['ArrowLeft', 'ArrowUp'].includes(e.key)) prev();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [next, prev]);

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
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.bg} transition-all duration-500`}>
        <div className="absolute inset-0 overflow-y-auto">
          <div className="min-h-full py-16">{slide.content}</div>
        </div>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-black/25 backdrop-blur-sm z-10">
        <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition text-sm font-bold">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-black text-xs">K</div>
          Kyra
        </Link>
        <span className="text-white/50 text-sm font-medium">{current + 1} / {SLIDES.length}</span>
        <Link href="/signup/agency" className="text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition">
          Start Free →
        </Link>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-8 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/50'}`}
          />
        ))}
      </div>

      {/* Arrows */}
      <button onClick={prev} disabled={current === 0}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white disabled:opacity-0 disabled:pointer-events-none transition">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={next} disabled={current === SLIDES.length - 1}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white disabled:opacity-0 disabled:pointer-events-none transition">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
