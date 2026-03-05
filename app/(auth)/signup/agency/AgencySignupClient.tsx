'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowRight, ArrowLeft, Check, Rocket, CheckCircle, Zap } from 'lucide-react';
import { pixel } from '@/components/analytics/MetaPixel';

export function AgencySignupWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-900">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      }
    >
      <AgencySignupPage />
    </Suspense>
  );
}

function AgencySignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const referralId = searchParams.get('ref') || '';
  const fromAgency = searchParams.get('from') || '';
  const trialDays = searchParams.get('trial') || '';
  const promoCode = searchParams.get('promo') || '';
  const referralSource = searchParams.get('src') || '';

  const [step, setStep] = useState<1 | 2>(1);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setStep(2);
      setCheckingAuth(false);
    }
    checkAuth();
  }, [supabase]);

  useEffect(() => {
    if (!slugEdited && agencyName) {
      setSlug(
        agencyName.toLowerCase().trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/[\s_]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  }, [agencyName, slugEdited]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { signup_type: 'agency' },
          emailRedirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent('/signup/agency?step=2')}`,
        },
      });
      if (err) { setError(err.message); return; }
      if (data.user && !data.session) { setEmailSent(true); return; }
      // Fire abandoned signup webhook — GHL can follow up if agency never created
      fetch('/api/auth/signup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch(() => {});
      pixel.lead({ content_name: 'Agency Signup Step 1', referral_source: referralSource || undefined });
      setStep(2);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Session expired. Please log in again.'); return; }

      const res = await fetch('/api/agency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agencyName,
          slug,
          plan: 'free',
          referralId: referralId || undefined,
          promoCode: promoCode || undefined,
          referralSource: referralSource || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create agency'); return; }
      pixel.completeRegistration({
        content_name: 'Agency Created',
        promo_code: promoCode || undefined,
        referral_source: referralSource || undefined,
      });
      // Send to referral success screen (shows link + early bird countdown)
      // then onboarding handles the rest
      const successUrl = `/signup/success?agencyId=${data.agencyId || ''}&next=/onboarding`;
      router.push(successUrl);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30">
            <CheckCircle className="h-7 w-7 text-green-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Check your email</h2>
          <p className="text-slate-400 mb-6">
            We sent a confirmation link to{' '}
            <strong className="text-white">{email}</strong>.
            Click it to continue setting up your agency.
          </p>
          <Link href="/login" className="text-sm text-slate-500 hover:text-white transition">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-xs">K</div>
            <span className="font-bold">Kyra AI</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition">
            Already have an account? <span className="text-indigo-400 font-medium">Sign in</span>
          </Link>
        </div>
      </nav>

      <div className="flex flex-col items-center justify-center px-4 py-10 lg:py-16">
        {/* Invite banner */}
        {fromAgency && (
          <div className="w-full max-w-md mb-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-5 py-4 flex items-start gap-3">
            <span className="text-2xl shrink-0">🎉</span>
            <div>
              <p className="font-semibold text-white text-sm">
                {fromAgency} invited you to Kyra
              </p>
              <p className="text-indigo-300 text-xs mt-0.5">
                {trialDays ? `You get a free ${trialDays}-day trial — no credit card required.` : 'Sign up to get started with your free trial.'}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse inline-block" />
            {fromAgency ? `${trialDays || '30'}-day free trial — invited by ${fromAgency}` : 'Free during beta — no credit card required'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">
            {step === 1 ? 'Deploy your first autonomous AI worker.' : 'Name your agency'}
          </h1>
          <p className="text-slate-400 text-lg">
            {step === 1
              ? 'Powered by OpenClaw — enterprise AI infrastructure built for autonomous agents.'
              : 'Almost there. One more step.'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[
            { n: 1, label: 'Account' },
            { n: 2, label: 'Agency' },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-3">
              {i > 0 && <div className="h-px w-10 bg-white/20" />}
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > n ? 'bg-green-500 text-white' :
                  step === n ? 'bg-indigo-600 text-white' :
                  'bg-white/10 text-slate-400'
                }`}>
                  {step > n ? <Check className="h-4 w-4" /> : n}
                </div>
                <span className={`text-sm font-medium ${step >= n ? 'text-white' : 'text-slate-500'}`}>
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Forms */}
        <div className="w-full max-w-md">

          {/* Step 1 */}
          {step === 1 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
              {error && (
                <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="you@agency.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={isLoading}
                    className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-50"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">At least 8 characters</p>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isLoading ? 'Creating account...' : 'Continue'}
                </button>
              </form>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleCreateAgency}>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-7 mb-4">
                {error && (
                  <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    {error}
                    {error.includes('session') && (
                      <a href="/login?redirect=/signup/agency" className="block mt-1 underline text-red-300">
                        Log in again →
                      </a>
                    )}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Agency name</label>
                    <input
                      type="text"
                      placeholder="Acme AI Agency"
                      value={agencyName}
                      onChange={e => setAgencyName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Agency URL slug</label>
                    <div className="flex items-center bg-slate-800 border border-white/20 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20">
                      <span className="pl-4 pr-2 text-slate-500 text-sm whitespace-nowrap">kyra.ai/</span>
                      <input
                        type="text"
                        placeholder="acme-ai"
                        value={slug}
                        onChange={e => {
                          setSlugEdited(true);
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                        }}
                        required
                        disabled={isLoading}
                        className="flex-1 bg-transparent py-3 pr-4 text-white placeholder-slate-500 text-base focus:outline-none"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">Lowercase, letters, numbers, hyphens</p>
                  </div>
                </div>
              </div>

              {/* What you get */}
              <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-indigo-400" />
                  <p className="text-sm font-semibold text-indigo-300">Free beta access includes:</p>
                </div>
                <ul className="space-y-1.5">
                  {[
                    'AI workers for your GHL clients',
                    'One agency dashboard for all clients',
                    'GHL integration (SMS, email, CRM)',
                    'Bring your own OpenAI API key',
                    'White-label — your brand, your clients',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:border-white/40 transition text-sm font-medium disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !agencyName || !slug}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  {isLoading ? 'Launching...' : 'Launch My Agency'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition font-medium">
              Sign in
            </Link>
          </p>

          {/* Trust signals */}
          <div className="mt-10 border-t border-white/10 pt-8 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { value: '24/7', label: 'Coverage across channels' },
                { value: '< 60s', label: 'AI response time' },
                { value: '100%', label: 'Leads responded to' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-xl font-black text-indigo-400">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Mini testimonials */}
            <div className="space-y-3">
              {[
                {
                  quote: "Set it up Friday. Monday morning 3 appointments were already booked — while the office was closed.",
                  niche: '🦷 Dental agency',
                },
                {
                  quote: "Clients don't care how it works. They see the bookings. They pay the invoice. That's the pitch.",
                  niche: '🏡 Real estate agency',
                },
                {
                  quote: "Our cannabis client was doing $27M a year. Kyra's AI SMS was a big part of why. It never sleeps.",
                  niche: '🌿 Cannabis agency',
                },
              ].map(t => (
                <div key={t.niche} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-sm text-slate-300 italic leading-relaxed">"{t.quote}"</p>
                  <p className="text-xs text-slate-500 mt-2">{t.niche}</p>
                </div>
              ))}
            </div>

            {/* Logos / integrations */}
            <div className="text-center">
              <p className="text-xs text-slate-600 mb-3">Works natively with</p>
              <div className="flex items-center justify-center gap-6 flex-wrap">
                {['GoHighLevel', 'OpenAI', 'Anthropic', 'Stripe'].map(logo => (
                  <span key={logo} className="text-xs font-bold text-slate-500 tracking-wide">{logo}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
