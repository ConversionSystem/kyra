'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Loader2,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Rocket,
} from 'lucide-react';

// Plans hidden during beta — all users get full access

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AgencySignupWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
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

  // Step tracking — check URL param and auth state
  const [step, setStep] = useState<1 | 2>(1);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Step 1: auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: agency details
  const [agencyName, setAgencyName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  // State
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // On mount: if user is already authenticated, skip to step 2
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Authenticated → go straight to agency details (step 2)
        setStep(2);
      }
      setCheckingAuth(false);
    }
    checkAuth();
  }, [supabase]);

  // Auto-generate slug from agency name (unless manually edited)
  useEffect(() => {
    if (!slugEdited && agencyName) {
      const generated = agencyName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generated);
    }
  }, [agencyName, slugEdited]);

  // ---- Step 1: Create account ----
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { signup_type: 'agency' },
          emailRedirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent('/signup/agency?step=2')}`,
        },
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      // If email confirmation required
      if (data.user && !data.session) {
        setEmailSent(true);
        return;
      }

      // Auto-confirmed (dev) → go to step 2
      setStep(2);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Step 2: Create agency ----
  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Verify we still have a valid session before submitting
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setError('Your session has expired. Please log in again.');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/agency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agencyName, slug, plan: 'beta' }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else {
          setError(data.error || 'Failed to create agency');
        }
        return;
      }

      // Success → redirect to agency dashboard
      router.push('/agency');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Loading while checking auth ----
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // ---- Email confirmation screen ----
  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Check your email</h2>
            <p className="text-gray-500">
              We&apos;ve sent a confirmation link to <strong className="text-gray-800">{email}</strong>.
              Click it to continue setting up your agency.
            </p>
            <Button variant="ghost" className="mt-4" asChild>
              <Link href="/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Join the Kyra Beta</h1>
          <p className="mt-2 text-gray-500">
            Full platform access · Bring your own API keys · Free during beta
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <StepBadge number={1} label="Account" active={step === 1} completed={step > 1} />
          <div className="h-px w-12 bg-gray-200" />
          <StepBadge number={2} label="Agency" active={step === 2} completed={false} />
        </div>

        {/* Step 1: Account creation */}
        {step === 1 && (
          <Card className="mx-auto w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Create your account</CardTitle>
              <CardDescription>Start with your email and a secure password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-800">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@agency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-800">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-400">Must be at least 8 characters</p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Continue
                </Button>
              </form>

              <div className="space-y-2 pt-2">
                <p className="text-center text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link href="/login" className="text-gray-900 hover:underline">
                    Log in
                  </Link>
                </p>
                <p className="text-center text-sm text-gray-400">
                  <Link href="/signup" className="hover:text-gray-700 hover:underline">
                    Sign up as individual instead
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Agency details + plan selection */}
        {step === 2 && (
          <form onSubmit={handleCreateAgency} className="space-y-8">
            {error && (
              <div className="mx-auto max-w-md rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                <p>{error}</p>
                {error.includes('session') && (
                  <a href="/login?redirect=/signup/agency" className="mt-1 block text-red-700 underline font-medium">
                    Log in again →
                  </a>
                )}
              </div>
            )}

            {/* Agency name & slug */}
            <Card className="mx-auto w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-xl">Agency details</CardTitle>
                <CardDescription>Tell us about your agency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="agencyName" className="text-sm font-medium text-gray-800">
                    Agency name
                  </label>
                  <Input
                    id="agencyName"
                    type="text"
                    placeholder="Acme AI Agency"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="slug" className="text-sm font-medium text-gray-800">
                    Agency URL
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">kyra.ai/</span>
                    <Input
                      id="slug"
                      type="text"
                      placeholder="acme-ai"
                      value={slug}
                      onChange={(e) => {
                        setSlugEdited(true);
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '')
                        );
                      }}
                      required
                      disabled={isLoading}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Lowercase letters, numbers, and hyphens only
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Beta access info */}
            <Card className="mx-auto w-full max-w-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wider">
                    Beta
                  </span>
                  <span className="text-sm font-medium text-gray-900">Full Access — Free</span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  During the beta, you get full platform access at no cost. Connect your own AI provider API keys (Anthropic, OpenAI, Google, etc.) — you only pay your provider directly.
                </p>
                <ul className="space-y-2">
                  {[
                    'Unlimited client AI instances',
                    'GoHighLevel integration',
                    'All channels (SMS, email, chat)',
                    'Bring your own API keys (any LLM)',
                    'Agency dashboard & templates',
                    'White-label branding',
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !agencyName || !slug}
                className="min-w-[160px]"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 h-4 w-4" />
                )}
                Launch Agency
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step badge sub-component
// ---------------------------------------------------------------------------
function StepBadge({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
          completed
            ? 'bg-green-50 text-green-600'
            : active
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 text-gray-400'
        }`}
      >
        {completed ? <Check className="h-4 w-4" /> : number}
      </div>
      <span
        className={`text-sm font-medium ${
          active ? 'text-gray-900' : completed ? 'text-green-600' : 'text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
