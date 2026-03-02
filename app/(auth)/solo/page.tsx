'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Rocket,
  Check,
  X,
  Bot,
  MessageSquare,
  BookOpen,
  Coins,
  Globe,
  ArrowRight,
  Clock,
  Zap,
  Users,
  BarChart3,
  CalendarCheck,
  Mail,
  HeadphonesIcon,
  ChevronDown,
  Shield,
  Sparkles,
} from 'lucide-react';

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition"
      >
        <span className="font-semibold text-sm text-white pr-4">{question}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed">{answer}</div>
      )}
    </div>
  );
}

export default function SoloSignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [businessName, setBusinessName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/solo-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, fullName, email, password, websiteUrl: websiteUrl || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Account created but sign-in failed. Please go to the login page.');
        return;
      }

      router.push('/agency');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const signupForm = (
    <div className="w-full max-w-md">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
        <h2 className="text-xl font-bold mb-1">Start free</h2>
        <p className="text-slate-400 text-sm mb-6">
          Your AI worker in 60 seconds. No credit card required.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Business name</label>
            <input type="text" placeholder="e.g. Mike's Plumbing" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required disabled={isLoading} className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Your name</label>
            <input type="text" placeholder="Mike Johnson" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={isLoading} className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input type="email" placeholder="mike@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} disabled={isLoading} className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50" />
            <p className="text-xs text-slate-500 mt-1.5">At least 8 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Website URL <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <div className="flex items-center bg-slate-800 border border-white/20 rounded-xl overflow-hidden focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20">
              <span className="pl-4 pr-1 text-slate-500"><Globe className="h-4 w-4" /></span>
              <input type="url" placeholder="https://your-business.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} disabled={isLoading} className="flex-1 bg-transparent py-3 pr-4 pl-2 text-white placeholder-slate-500 text-base focus:outline-none" />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">We&apos;ll train your AI from your website content</p>
          </div>
          <button type="submit" disabled={isLoading || !businessName || !fullName || !email || !password} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm mt-2">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Setting up your AI worker...</>
            ) : (
              <><Rocket className="h-4 w-4" />Launch My AI Worker — Free</>
            )}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" />No credit card</span>
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" />Cancel anytime</span>
        </div>
      </div>

      <div className="mt-4 text-center space-y-2">
        <p className="text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 transition font-medium">Sign in</Link>
        </p>
        <p className="text-sm text-slate-500">
          Running an agency?{' '}
          <Link href="/signup/agency" className="text-indigo-400 hover:text-indigo-300 transition font-medium">
            Agency signup <ArrowRight className="h-3 w-3 inline" />
          </Link>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-xs">K</div>
            <span className="font-bold">Kyra Solo</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/signup/agency" className="text-sm text-slate-400 hover:text-white transition hidden sm:block">
              Agency? <span className="text-indigo-400 font-medium">Sign up here</span>
            </Link>
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition">Sign in</Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: HERO — Form above the fold
         ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row items-start justify-center gap-8 lg:gap-12 px-4 py-10 lg:py-16 max-w-5xl mx-auto">
        {/* Left: Benefits */}
        <div className="w-full lg:w-[380px] lg:sticky lg:top-24 shrink-0">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Free during beta — no credit card
          </div>

          <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
            Your AI worker.
            <br />
            <span className="text-emerald-400">60 seconds to launch.</span>
          </h1>
          <p className="text-slate-400 text-lg mb-4">
            One AI that answers customers, manages your CRM, and never sleeps. Built for solo business owners.
          </p>
          <p className="text-slate-500 text-sm mb-8 flex items-center gap-2">
            Powered by{' '}
            <a href="https://openclaw.ai" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white font-semibold transition inline-flex items-center gap-1">
              OpenClaw
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-medium text-slate-400">AI</span>
            </a>
            — the open-source AI agent platform
          </p>

          <div className="space-y-4">
            {[
              { icon: Bot, title: 'Your Own OpenClaw Agent', desc: 'A dedicated OpenClaw AI worker — trained on your business, running 24/7' },
              { icon: MessageSquare, title: 'Web Chat', desc: 'Embed on your site — customers chat with your AI 24/7' },
              { icon: BookOpen, title: 'Train from Website', desc: 'Drop your URL — AI learns your business instantly' },
              { icon: Coins, title: '50 Free Credits/Month', desc: 'Enough for 50 AI conversations — on the house' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{item.title}</p>
                  <p className="text-slate-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form */}
        {signupForm}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: THE PROBLEM — Pain points
         ═══════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/5 px-4 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Sound familiar?</p>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
              You didn&apos;t start a business to<br className="hidden sm:block" /> drown in busywork.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { emoji: '⏳', title: 'You\'re the bottleneck', desc: 'Every task, decision, and follow-up runs through you. There\'s no leverage — just more hours.' },
              { emoji: '💸', title: 'Leads slip through the cracks', desc: 'Someone asks a question at 11pm. You see it at 9am. They already went to your competitor.' },
              { emoji: '📱', title: 'You\'re glued to your phone', desc: 'Checking DMs, replying to inquiries, scheduling appointments — all day, every day.' },
              { emoji: '🤖', title: '"AI" hasn\'t changed anything', desc: 'You\'ve tried ChatGPT. Maybe a chatbot. But nothing is actually plugged into your business.' },
              { emoji: '📉', title: 'No follow-up system', desc: 'First contact happens. Then... silence. No sequences, no reminders, no second chances.' },
              { emoji: '🧑‍💼', title: 'Can\'t afford to hire yet', desc: 'A receptionist costs $3K/month. A VA is $1.5K. You need help but the budget isn\'t there.' },
            ].map((pain) => (
              <div key={pain.title} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="text-2xl mb-3">{pain.emoji}</div>
                <h3 className="font-bold text-white text-sm mb-1.5">{pain.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{pain.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: BEFORE / AFTER — The shift
         ═══════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/5 px-4 py-16 lg:py-24 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">The shift</p>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
              Stop doing everything yourself.
            </h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">
              Kyra gives you your own OpenClaw AI agent — a real AI worker that handles the tasks you keep putting off.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Before */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
              <h3 className="font-bold text-red-400 text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <X className="h-4 w-4" /> Without Kyra
              </h3>
              <div className="space-y-3">
                {[
                  'Miss leads that message after hours',
                  'Manually reply to every inquiry',
                  'No CRM — contacts in your phone notes',
                  'Forget to follow up (again)',
                  'Website visitors leave without engaging',
                  'Pay $1,500+/mo for a VA or receptionist',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <X className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-slate-400 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* After */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
              <h3 className="font-bold text-emerald-400 text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <Check className="h-4 w-4" /> With Kyra
              </h3>
              <div className="space-y-3">
                {[
                  'AI answers leads 24/7 — even at 3am',
                  'Instant, personalized responses every time',
                  'Built-in CRM tracks every contact & deal',
                  'Automated follow-ups that never forget',
                  'Web chat turns visitors into conversations',
                  'Free. No VA. No hiring. No overhead.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-slate-300 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4: USE CASES — What Kyra actually does
         ═══════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/5 px-4 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">What it does</p>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
              Real tasks. Handled automatically.
            </h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">
              These are things you do every day — that Kyra handles while you focus on your actual work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                icon: MessageSquare,
                title: 'Answer Every Customer — Instantly',
                desc: 'Someone messages at 2am? Kyra responds in seconds with accurate, personalized answers trained on your business. No more lost leads.',
                tag: 'Web Chat',
              },
              {
                icon: CalendarCheck,
                title: 'Book Appointments On Autopilot',
                desc: 'Kyra qualifies the lead, answers their questions, and pushes them to book — all without you lifting a finger.',
                tag: 'Scheduling',
              },
              {
                icon: Users,
                title: 'CRM That Fills Itself',
                desc: 'Every conversation auto-creates a contact. Every deal gets tracked. No more leads in sticky notes or forgotten DMs.',
                tag: 'CRM',
              },
              {
                icon: Mail,
                title: 'Follow Up Without Thinking',
                desc: 'Lead went quiet? Kyra sends the follow-up. The right message, right timing, every time. No sequences to build.',
                tag: 'Follow-ups',
              },
              {
                icon: HeadphonesIcon,
                title: 'Customer Support That Scales',
                desc: 'Common questions, hours, pricing, policies — Kyra handles them all. Trained on your website, sounds like you.',
                tag: 'Support',
              },
              {
                icon: BarChart3,
                title: 'Know What\'s Working',
                desc: 'See every conversation, every lead, every deal in one dashboard. Know exactly where your business stands.',
                tag: 'Analytics',
              },
            ].map((uc) => (
              <div key={uc.title} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-emerald-500/30 transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <uc.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">{uc.tag}</span>
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5">{uc.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5: HOW IT WORKS — 3 steps
         ═══════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/5 px-4 py-16 lg:py-24 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-2xl sm:text-3xl font-black">Three steps. Sixty seconds.</h2>
          </div>

          <div className="space-y-6">
            {[
              {
                step: '01',
                title: 'Sign up & drop your website',
                desc: 'Fill in your business name, paste your website URL, and hit launch. That\'s it. No credit card, no setup call, no onboarding deck.',
                icon: Rocket,
              },
              {
                step: '02',
                title: 'OpenClaw trains on your business',
                desc: 'Your OpenClaw agent reads your website, learns your services, hours, pricing, and FAQs. It sounds like you — not a generic chatbot.',
                icon: Sparkles,
              },
              {
                step: '03',
                title: 'Go live — customers talk to your AI',
                desc: 'Embed the web chat on your site or share the link. Your OpenClaw agent answers questions, captures leads, and fills your CRM — automatically.',
                icon: Zap,
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-5 items-start">
                <div className="shrink-0 flex flex-col items-center">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  {s.step !== '03' && <div className="w-px h-6 bg-emerald-500/20 mt-2" />}
                </div>
                <div className="pt-1">
                  <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Step {s.step}</p>
                  <h3 className="font-bold text-white mb-1">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6: STATS BAR
         ═══════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/5 px-4 py-12">
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: '24/7', label: 'Always responding', icon: Clock },
            { value: '< 5s', label: 'Response time', icon: Zap },
            { value: '$0', label: 'Monthly cost', icon: Coins },
            { value: '60s', label: 'To launch', icon: Rocket },
          ].map((stat) => (
            <div key={stat.label}>
              <stat.icon className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6.5: BELIEF SHIFTS
         ═══════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/5 px-4 py-16 lg:py-24">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Objections Destroyed</p>
            <h2 className="text-2xl sm:text-3xl font-black">Still thinking about it?</h2>
            <p className="text-slate-400 text-sm mt-3">Every excuse you have — answered.</p>
          </div>
          <div className="space-y-3">
            {[
              { old: '"I\'m not technical enough for AI."', truth: 'If you can fill out a form, you can launch Kyra. Paste your website, pick your style, done. Zero code. Zero terminal. Zero setup guides.' },
              { old: '"I tried AI chatbots before. They were terrible."', truth: 'Chatbots follow scripts. Kyra reads your entire website, learns your services and pricing, remembers past conversations, and responds like a human who actually works at your business.' },
              { old: '"I\'ll set this up when things calm down."', truth: 'You\'re busy because you\'re doing everything yourself. Kyra handles leads at 11pm, answers the same questions for the 50th time, and follows up automatically. The busy IS why you need this.' },
              { old: '"AI will make my business feel impersonal."', truth: 'Your AI is trained on YOUR voice, YOUR website, YOUR way of doing things. Customers think they\'re talking to your team. And you can review every conversation.' },
              { old: '"Free? What\'s the catch?"', truth: 'The catch is we want you to love it so much you tell other business owners. That\'s it. 50 credits/month, full CRM, web chat — free. No credit card. No trial that expires.' },
            ].map((item, i) => (
              <div key={i} className="border border-white/10 rounded-xl p-5 bg-white/[0.02] hover:bg-white/[0.04] transition">
                <p className="text-red-400/70 text-sm font-semibold line-through mb-2">{item.old}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{item.truth}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 7: FAQ
         ═══════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/5 px-4 py-16 lg:py-24 bg-white/[0.02]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Questions</p>
            <h2 className="text-2xl sm:text-3xl font-black">Got questions?</h2>
          </div>

          <div className="space-y-3">
            <FAQItem
              question="Is this really free?"
              answer="Yes. During the beta, you get a full AI worker, CRM, web chat, and 50 credits per month — completely free. No credit card required. When we launch paid tiers, early beta users will be grandfathered in."
            />
            <FAQItem
              question="Do I need to be technical?"
              answer="Not at all. If you can fill out a form, you can launch Kyra. Sign up, paste your website, and your AI is live. No coding, no APIs, no setup guides."
            />
            <FAQItem
              question="What counts as a 'credit'?"
              answer="One credit = one AI conversation turn. When a customer asks your AI a question and gets a response, that's one credit. 50 credits per month covers most solo businesses. Need more? Upgrade anytime."
            />
            <FAQItem
              question="How does the AI know about my business?"
              answer="When you paste your website URL, Kyra reads every page — services, pricing, hours, FAQs — and trains your AI on that content. It sounds like you, not a generic bot. You can also add custom knowledge in the dashboard."
            />
            <FAQItem
              question="Can I add SMS, email, or a sales pipeline later?"
              answer="Absolutely. The free tier includes web chat and CRM. When you're ready for SMS, email outreach, automated follow-ups, or a full sales pipeline, just upgrade to a paid plan. Everything is already built — you just unlock it."
            />
            <FAQItem
              question="What is OpenClaw?"
              answer="OpenClaw is the leading open-source AI agent platform — the technology that powers your Kyra AI worker. It's trusted by thousands of developers and businesses worldwide. Kyra gives you the power of OpenClaw without any setup complexity — we handle the hosting, configuration, and infrastructure so you just get a working AI."
            />
            <FAQItem
              question="Is my data safe?"
              answer="Your AI runs in its own isolated OpenClaw container — completely separate from other users. Your data never touches another account. We use enterprise-grade encryption and your container runs on secure, dedicated infrastructure."
            />
            <FAQItem
              question="What happens after the beta?"
              answer="We'll introduce paid tiers for power users who need more credits, SMS/email channels, and advanced pipeline features. Free beta users get priority pricing and will never lose access to what they signed up for."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 8: FINAL CTA
         ═══════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/5 px-4 py-16 lg:py-24">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            Free beta — limited spots
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            Your competitors aren&apos;t waiting.
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            While you manually reply to every message, the business down the street has an AI that never sleeps, never forgets, and never takes a day off.
          </p>
          <Link
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-8 rounded-xl transition text-sm"
          >
            <Rocket className="h-4 w-4" />
            Launch My AI Worker — Free
          </Link>
          <p className="text-xs text-slate-500 mt-4">No credit card · 60 seconds · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center font-black text-[10px]">K</div>
            <span className="text-sm text-slate-500">Kyra · Powered by <a href="https://openclaw.ai" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition">OpenClaw</a></span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/login" className="hover:text-white transition">Sign in</Link>
            <Link href="/signup/agency" className="hover:text-white transition">Agencies</Link>
            <Link href="/" className="hover:text-white transition">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
