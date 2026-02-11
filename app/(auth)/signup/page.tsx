'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, CheckCircle } from 'lucide-react';

import { Suspense } from 'react';

export default function SignupPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    }>
      <SignupPage />
    </Suspense>
  );
}

function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan'); // e.g. 'starter', 'business', 'max'
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  /**
   * After signup/login, redirect to Stripe Checkout if a paid plan was selected,
   * otherwise go straight to /chat.
   */
  const redirectAfterAuth = async () => {
    if (selectedPlan && ['starter', 'business', 'max'].includes(selectedPlan)) {
      try {
        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: selectedPlan }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      } catch (err) {
        console.error('Failed to create checkout session:', err);
      }
    }
    router.push('/chat');
    router.refresh();
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const emailRedirectTo = selectedPlan
        ? `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(`/chat?plan=${selectedPlan}`)}`
        : `${window.location.origin}/api/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            ...(selectedPlan ? { selected_plan: selectedPlan } : {}),
          },
          emailRedirectTo,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      // If email confirmation is required
      if (data.user && !data.session) {
        setSuccess(true);
        return;
      }

      // If auto-confirmed (for development) — redirect to Stripe or chat
      await redirectAfterAuth();
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      const redirectTo = selectedPlan
        ? `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(`/chat?plan=${selectedPlan}`)}`
        : `${window.location.origin}/api/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        setError(error.message);
        setIsGoogleLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-100">Check your email</h2>
            <p className="text-zinc-400">
              We've sent you a confirmation link to <strong>{email}</strong>. 
              Click it to activate your account.
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Get started with your personal AI assistant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-zinc-400">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-zinc-200">
                Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading || isGoogleLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-200">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isGoogleLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-200">
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
                disabled={isLoading || isGoogleLoading}
              />
              <p className="text-xs text-zinc-500">Must be at least 8 characters</p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="text-zinc-100 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
