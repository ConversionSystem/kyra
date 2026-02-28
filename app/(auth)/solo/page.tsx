'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Rocket,
  Check,
  Bot,
  MessageSquare,
  BookOpen,
  Coins,
  Globe,
  ArrowRight,
} from 'lucide-react';

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
      // 1. Call our solo-signup API to create everything server-side
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

      // 2. Sign in the user (the API auto-confirmed the email)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Account created but sign-in failed. Please go to the login page.');
        return;
      }

      // 3. Redirect to dashboard
      router.push('/agency');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-xs">
              K
            </div>
            <span className="font-bold">Kyra Solo</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/signup/agency"
              className="text-sm text-slate-400 hover:text-white transition hidden sm:block"
            >
              Agency? <span className="text-indigo-400 font-medium">Sign up here</span>
            </Link>
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

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
          <p className="text-slate-400 text-lg mb-8">
            One AI that answers customers, manages your CRM, and never sleeps.
            Built for solo business owners.
          </p>

          <div className="space-y-4">
            {[
              {
                icon: Bot,
                title: '1 AI Worker',
                desc: 'Your own autonomous AI — trained on your business',
              },
              {
                icon: MessageSquare,
                title: 'Web Chat',
                desc: 'Embed on your site — customers chat with your AI 24/7',
              },
              {
                icon: BookOpen,
                title: 'Train from Website',
                desc: 'Drop your URL — AI learns your business instantly',
              },
              {
                icon: Coins,
                title: '50 Free Credits/Month',
                desc: 'Enough for 50 AI conversations — on the house',
              },
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

          <div className="mt-8 hidden lg:block">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-sm text-slate-300 italic leading-relaxed">
                &quot;I set up Kyra for my plumbing business on a Saturday morning. By Monday, it had booked 3 appointments while I was on a job.&quot;
              </p>
              <p className="text-xs text-slate-500 mt-2">🔧 Solo plumber, Austin TX</p>
            </div>
          </div>
        </div>

        {/* Right: Form */}
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
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Business name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mike's Plumbing"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  placeholder="Mike Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="mike@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50"
                />
                <p className="text-xs text-slate-500 mt-1.5">At least 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Website URL{' '}
                  <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <div className="flex items-center bg-slate-800 border border-white/20 rounded-xl overflow-hidden focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20">
                  <span className="pl-4 pr-1 text-slate-500">
                    <Globe className="h-4 w-4" />
                  </span>
                  <input
                    type="url"
                    placeholder="https://your-business.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 bg-transparent py-3 pr-4 pl-2 text-white placeholder-slate-500 text-base focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  We&apos;ll train your AI from your website content
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !businessName || !fullName || !email || !password}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up your AI worker...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Launch My AI Worker — Free
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-400" />
                No credit card
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-400" />
                Cancel anytime
              </span>
            </div>
          </div>

          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-emerald-400 hover:text-emerald-300 transition font-medium"
              >
                Sign in
              </Link>
            </p>
            <p className="text-sm text-slate-500">
              Running an agency?{' '}
              <Link
                href="/signup/agency"
                className="text-indigo-400 hover:text-indigo-300 transition font-medium"
              >
                Agency signup <ArrowRight className="h-3 w-3 inline" />
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer trust signals for mobile */}
      <div className="lg:hidden px-4 pb-10">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-sm text-slate-300 italic leading-relaxed">
            &quot;I set up Kyra for my plumbing business on a Saturday morning. By Monday, it had booked 3 appointments while I was on a job.&quot;
          </p>
          <p className="text-xs text-slate-500 mt-2">🔧 Solo plumber, Austin TX</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center mt-6">
          {[
            { value: '24/7', label: 'Always on' },
            { value: '< 60s', label: 'Response time' },
            { value: '50', label: 'Free credits' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xl font-black text-emerald-400">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
