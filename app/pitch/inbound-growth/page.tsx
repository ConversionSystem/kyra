'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, CheckCircle2, ArrowRight,
  Target, MessageSquare, Search, Fish, BarChart3,
  Sparkles, Brain, Clock, Send, Eye, Users, Zap,
} from 'lucide-react';

// ── Types & helpers ─────────────────────────────────────────────────────────────

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

// ── Slides ──────────────────────────────────────────────────────────────────────

const SLIDES: Slide[] = [
  // ── Slide 1: Hero ─────────────────────────────────────────────────────────
  {
    id: 'hero',
    bg: 'from-slate-900 via-indigo-950 to-slate-900',
    content: (
      <div className="flex flex-col items-center justify-center text-center px-8 h-full">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm font-medium text-white/80 mb-6">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            Powered by Kyra × OpenClaw
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.05] mb-6">
            Your Inbound
            <br />
            <span className="text-indigo-400">Growth Machine</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            5 AI workers. One coordinated system. LinkedIn content, engagement,
            research, leads — on autopilot.
          </p>
        </div>

        {/* 5 agent icons in a network layout */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 mt-4">
          {/* Center brain */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center z-10 shadow-lg shadow-indigo-500/40">
            <Brain className="h-8 w-8 text-white" />
          </div>
          {/* Connecting lines (decorative) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-white/10" />
          {/* Agent nodes */}
          {[
            { icon: Target, label: 'Content', color: 'bg-red-500/20 text-red-400', angle: -90 },
            { icon: MessageSquare, label: 'Engage', color: 'bg-blue-500/20 text-blue-400', angle: -18 },
            { icon: Search, label: 'Research', color: 'bg-emerald-500/20 text-emerald-400', angle: 54 },
            { icon: Fish, label: 'Leads', color: 'bg-amber-500/20 text-amber-400', angle: 126 },
            { icon: BarChart3, label: 'Ops', color: 'bg-purple-500/20 text-purple-400', angle: 198 },
          ].map(({ icon: Icon, label, color, angle }) => {
            const r = 100;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;
            return (
              <div
                key={label}
                className="absolute flex flex-col items-center gap-1"
                style={{
                  top: `calc(50% + ${y}px)`,
                  left: `calc(50% + ${x}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] text-white/60 font-medium">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    ),
  },

  // ── Slide 2: What You Asked For ───────────────────────────────────────────
  {
    id: 'requirements',
    bg: 'from-emerald-950 via-slate-900 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-10 text-center">
          What you <span className="text-emerald-400">asked for</span>
        </h2>
        <div className="space-y-4 mb-10">
          {[
            'Daily LinkedIn content creation',
            'Intelligent commenting for visibility',
            'Ongoing research + trend tracking',
            'Identifying leads from conversations',
            'Organizing everything into logs/memory',
            'Automating as much of the workflow as possible',
          ].map(item => (
            <div key={item} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              <span className="text-white text-lg">{item}</span>
            </div>
          ))}
        </div>
        <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-xl p-5 text-center">
          <p className="text-slate-300 leading-relaxed">
            Everything you asked for, plus things you didn&apos;t think of:{' '}
            <span className="text-indigo-400 font-semibold">
              approval workflows, cross-agent memory, performance analytics, and lead scoring.
            </span>
          </p>
        </div>
      </div>
    ),
  },

  // ── Slide 3: The 5-Agent System (overview) ────────────────────────────────
  {
    id: 'system-overview',
    bg: 'from-slate-900 via-indigo-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-10 text-center">
          The <span className="text-indigo-400">5-Agent</span> System
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { emoji: '🎯', title: 'Content Strategist', desc: 'Creates daily posts in your voice', color: 'bg-red-500/20 border-red-500/20' },
            { emoji: '💬', title: 'Engagement Builder', desc: 'Intelligent comments on target accounts', color: 'bg-blue-500/20 border-blue-500/20' },
            { emoji: '🔍', title: 'Research & Trends', desc: 'Scans your industry daily', color: 'bg-emerald-500/20 border-emerald-500/20' },
            { emoji: '🎣', title: 'Lead Identifier', desc: 'Spots buying signals in conversations', color: 'bg-amber-500/20 border-amber-500/20' },
            { emoji: '📊', title: 'Operations & Memory', desc: 'Logs everything, reports weekly', color: 'bg-purple-500/20 border-purple-500/20' },
          ].map(({ emoji, title, desc, color }) => (
            <div key={title} className={`${color} border rounded-xl p-5 flex items-start gap-4`}>
              <span className="text-3xl shrink-0">{emoji}</span>
              <div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-sm text-slate-400 mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Brain className="h-5 w-5 text-indigo-400" />
            <span className="font-bold text-white">One brain. Shared memory.</span>
          </div>
          <p className="text-slate-400">They coordinate automatically.</p>
        </div>
      </div>
    ),
  },

  // ── Slide 4: Content Strategist (detail) ──────────────────────────────────
  {
    id: 'content-strategist',
    bg: 'from-red-950 via-slate-900 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">🎯</span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white">
            Content <span className="text-red-400">Strategist</span>
          </h2>
        </div>
        <p className="text-slate-400 text-lg mb-8">Your daily LinkedIn content engine — posts that sound like you, not a robot.</p>
        <div className="space-y-4">
          {[
            { icon: Search, text: 'Researches your industry every morning' },
            { icon: Send, text: 'Drafts 1–2 LinkedIn posts daily' },
            { icon: Sparkles, text: 'Suggests hooks and formats: carousel, story, data post, hot take' },
            { icon: MessageSquare, text: 'You approve in Telegram → queues for publishing' },
            { icon: BarChart3, text: 'Adapts based on what gets engagement' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="rounded-xl bg-red-500/20 p-2.5 shrink-0">
                <Icon className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-white leading-relaxed pt-1">{text}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── Slide 5: Engagement Builder (detail) ──────────────────────────────────
  {
    id: 'engagement-builder',
    bg: 'from-blue-950 via-slate-900 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">💬</span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white">
            Engagement <span className="text-blue-400">Builder</span>
          </h2>
        </div>
        <p className="text-slate-400 text-lg mb-8">Strategic commenting that gets you noticed by the right people.</p>
        <div className="space-y-4">
          {[
            { icon: Users, text: 'Monitors 20–50 target accounts you define' },
            { icon: Clock, text: 'Drafts thoughtful comments within 30 minutes of their posts' },
            { icon: Send, text: 'You approve via Telegram → it comments' },
            { icon: Sparkles, text: 'Rotates styles: add data, share experience, ask smart question' },
            { icon: Eye, text: 'Tracks which comments generate profile visits' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="rounded-xl bg-blue-500/20 p-2.5 shrink-0">
                <Icon className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-white leading-relaxed pt-1">{text}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── Slide 6: Research + Lead Identifier (detail) ──────────────────────────
  {
    id: 'research-leads',
    bg: 'from-emerald-950 via-slate-900 to-amber-950',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Research */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔍</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Research & <span className="text-emerald-400">Trends</span>
              </h2>
            </div>
            <div className="space-y-3">
              {[
                'Scans blogs, RSS, Reddit, Twitter, LinkedIn trending',
                'Weekly trend briefing delivered to you',
                'Competitor content monitoring',
              ].map(text => (
                <div key={text} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-white text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Identifier */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎣</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Lead <span className="text-amber-400">Identifier</span>
              </h2>
            </div>
            <div className="space-y-3">
              {[
                'Scans comments for buying signals',
                'Flags warm leads with context',
                'Cross-references with CRM',
              ].map(text => (
                <div key={text} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <CheckCircle2 className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-white text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Example lead alert */}
        <div className="mt-8 bg-amber-500/10 border border-amber-400/20 rounded-xl p-5">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2">Example Lead Alert</p>
          <p className="text-white leading-relaxed">
            &quot;Sarah Chen (VP Marketing at Acme) commented on your AI post — she mentioned
            struggling with content at scale.&quot;
          </p>
        </div>
      </div>
    ),
  },

  // ── Slide 7: Daily Workflow ───────────────────────────────────────────────
  {
    id: 'daily-workflow',
    bg: 'from-slate-900 via-slate-900 to-indigo-950',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4 text-center">
          Your <span className="text-indigo-400">daily workflow</span>
        </h2>
        <p className="text-slate-400 text-center mb-10">Everything runs. You just approve.</p>

        <div className="space-y-3">
          {[
            { time: '7:00 AM', event: 'Research agent scans overnight news', color: 'bg-emerald-500/20 text-emerald-400' },
            { time: '8:00 AM', event: 'Content Strategist drafts today\'s post → Telegram', color: 'bg-red-500/20 text-red-400' },
            { time: '8:30 AM', event: 'You approve → post goes out', color: 'bg-indigo-500/20 text-indigo-400' },
            { time: 'All day', event: 'Engagement Builder comments (you approve each)', color: 'bg-blue-500/20 text-blue-400' },
            { time: 'Real-time', event: 'Lead Identifier flags buying signals', color: 'bg-amber-500/20 text-amber-400' },
            { time: '6:00 PM', event: 'Operations logs the day, sends summary', color: 'bg-purple-500/20 text-purple-400' },
          ].map(({ time, event, color }) => (
            <div key={time} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 w-24 text-center ${color}`}>
                {time}
              </span>
              <span className="text-white">{event}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/20 rounded-full px-5 py-2.5">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span className="text-indigo-400 font-bold">Your total time: ~15 minutes/day</span>
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 8: What You Get (deliverables) ──────────────────────────────────
  {
    id: 'deliverables',
    bg: 'from-slate-900 via-indigo-950 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-10 text-center">
          What you <span className="text-indigo-400">get</span>
        </h2>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-2 bg-white/5 px-6 py-3 border-b border-white/10">
            <span className="text-sm font-bold text-white/60 uppercase tracking-wider">Deliverable</span>
            <span className="text-sm font-bold text-white/60 uppercase tracking-wider text-right">Frequency</span>
          </div>
          {[
            { item: 'Original LinkedIn posts', freq: '1–2/day' },
            { item: 'Intelligent comments', freq: '5–10/day' },
            { item: 'Trend briefing', freq: 'Weekly' },
            { item: 'Lead alerts with context', freq: 'Real-time' },
            { item: 'Performance report', freq: 'Weekly' },
            { item: 'Full activity logs', freq: 'Daily' },
          ].map(({ item, freq }, i) => (
            <div key={item} className={`grid grid-cols-2 px-6 py-4 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'} ${i < 5 ? 'border-b border-white/5' : ''}`}>
              <span className="text-white font-medium">{item}</span>
              <span className="text-indigo-400 font-semibold text-right">{freq}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── Slide 9: Pricing ──────────────────────────────────────────────────────
  {
    id: 'pricing',
    bg: 'from-indigo-950 via-slate-900 to-slate-900',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-12 min-h-full max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-2 text-center">
          Simple <span className="text-indigo-400">pricing.</span>
        </h2>
        <p className="text-slate-400 text-center mb-8">Everything included. No hidden fees.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
          {/* Growth Engine */}
          <div className="rounded-2xl p-6 flex flex-col bg-white/10 text-white border border-white/20">
            <h3 className="text-xl font-bold text-white">Growth Engine</h3>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-black">$1,500</span>
              <span className="text-sm text-white/60">/mo</span>
            </div>
            <ul className="mt-4 space-y-2 flex-1">
              {['All 5 AI agents', 'Telegram approval workflow', 'CRM integration', 'Weekly performance reports', 'Full activity logs'].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
                  <span className="text-white/80">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Growth + Strategy (highlighted) */}
          <div className="rounded-2xl p-6 flex flex-col bg-white text-gray-900 ring-2 ring-indigo-400 shadow-2xl shadow-indigo-500/20 scale-105">
            <div className="text-center mb-3">
              <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMENDED</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Growth + Strategy</h3>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-black">$2,000</span>
              <span className="text-sm text-gray-500">/mo</span>
            </div>
            <ul className="mt-4 space-y-2 flex-1">
              {['Everything in Growth Engine', 'Monthly strategy call', 'Quarterly content audit', 'Priority support', 'Custom agent tuning'].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                  <span className="text-gray-700">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Setup */}
          <div className="rounded-2xl p-6 flex flex-col bg-white/10 text-white border border-white/20">
            <h3 className="text-xl font-bold text-white">Setup</h3>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-black">$500</span>
              <span className="text-sm text-white/60">one-time</span>
            </div>
            <ul className="mt-4 space-y-2 flex-1">
              {['Configure all 5 agents', 'Define target accounts', 'Set voice & tone', 'CRM connection', 'Telegram bot setup'].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
                  <span className="text-white/80">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-slate-400 text-center text-lg">
          A human doing this costs <span className="text-white font-bold">$4–6K/mo</span>. You pay <span className="text-indigo-400 font-bold">25%</span> of that.
        </p>
      </div>
    ),
  },

  // ── Slide 10: How We're Different ─────────────────────────────────────────
  {
    id: 'differentiators',
    bg: 'from-slate-900 via-slate-900 to-purple-950',
    content: (
      <div className="flex flex-col justify-center px-4 sm:px-8 lg:px-16 min-h-full max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-10 text-center">
          How we&apos;re <span className="text-indigo-400">different</span>
        </h2>
        <div className="space-y-4">
          {[
            { icon: Users, title: 'Not a chatbot — 5 specialized agents that coordinate', desc: 'Each agent has a distinct role. They share memory and work together as a team.' },
            { icon: Send, title: 'Nothing goes out without your approval', desc: 'Every post, every comment flows through Telegram. You\'re always in control.' },
            { icon: Brain, title: 'Shared memory across all agents', desc: 'Content agent knows what Research found. Lead agent knows what you posted. One brain.' },
            { icon: Zap, title: 'We manage it — monitoring, fixes, updates included', desc: 'We keep the system running and improving. You focus on your business.' },
            { icon: Sparkles, title: 'Built on OpenClaw', desc: 'The same framework used by thousands of AI agents worldwide. Enterprise-grade infrastructure.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-xl p-5">
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

  // ── Slide 11: Next Steps (CTA) ────────────────────────────────────────────
  {
    id: 'next-steps',
    bg: 'from-indigo-950 via-indigo-900 to-slate-900',
    content: (
      <div className="flex flex-col items-center justify-center text-center px-8 h-full">
        <div className="mb-10">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            Ready to grow on
            <br />
            <span className="text-indigo-400">autopilot?</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-xl mx-auto leading-relaxed mb-10">
            Let&apos;s get your inbound growth engine running.
          </p>

          <div className="space-y-4 text-left max-w-md mx-auto mb-10">
            {[
              { n: 1, text: '15-min call to learn your voice, targets, industry' },
              { n: 2, text: 'Setup in 2–3 days' },
              { n: 3, text: 'First post in 72 hours' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-center gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-black text-white">
                  {n}
                </div>
                <span className="text-white text-lg">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <a
          href="mailto:angel@conversionsystem.com?subject=Inbound Growth Engine"
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-base sm:text-xl px-6 sm:px-10 py-4 sm:py-5 rounded-2xl shadow-lg shadow-indigo-500/30"
        >
          Let&apos;s Talk <ArrowRight className="h-5 w-5" />
        </a>

        <p className="text-slate-500 text-sm mt-6">
          angel@conversionsystem.com
        </p>
      </div>
    ),
  },
];

// ── Presentation Component ──────────────────────────────────────────────────────

export default function InboundGrowthPitch() {
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

      {/* Navigation arrows */}
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
