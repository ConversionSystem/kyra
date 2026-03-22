'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null = checking, true = ready to set password, false = invalid/expired
  const [ready, setReady] = useState<boolean | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function processResetToken() {
      // Strategy 1: Parse tokens directly from the URL hash.
      // This is the most reliable approach for mobile email clients
      // (in-app browsers don't always fire onAuthStateChange in time).
      const hash = window.location.hash;

      if (hash && hash.includes('type=recovery')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            // Clear the hash so tokens aren't visible in the URL
            window.history.replaceState(null, '', window.location.pathname);
            setReady(true);
            return;
          }
        }
        // Hash had recovery type but tokens were invalid/expired
        setReady(false);
        return;
      }

      // Strategy 2: No hash — check if there's already an active recovery session
      // (e.g. user refreshed the page after strategy 1 already ran)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
        return;
      }

      // Strategy 3: Listen for PASSWORD_RECOVERY event as final fallback
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setReady(true);
          subscription.unsubscribe();
        }
      });

      // Give it 3 seconds, then give up
      setTimeout(() => {
        setReady(prev => {
          if (prev === null) {
            subscription.unsubscribe();
            return false;
          }
          return prev;
        });
      }, 3000);
    }

    processResetToken();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/agency'), 2500);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Checking
  if (ready === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm text-gray-500">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>Choose a strong password for your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Invalid / expired */}
          {!ready && !done && (
            <div className="text-center space-y-4">
              <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-800 text-left">
                <p className="font-semibold mb-1">Reset link not working</p>
                <p className="text-amber-700">Reset links expire after 1 hour and can only be used once. Please request a new one — it only takes a few seconds.</p>
              </div>
              <Link href="/forgot-password">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Request a new reset link
                </Button>
              </Link>
              <Link href="/login" className="block text-sm text-gray-500 hover:text-gray-700 text-center">
                Back to sign in
              </Link>
            </div>
          )}

          {/* Success */}
          {done && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-gray-900">Password updated!</p>
                <p className="text-sm text-gray-500 mt-1">Taking you to the dashboard...</p>
              </div>
            </div>
          )}

          {/* Password form */}
          {ready && !done && (
            <>
              {error && (
                <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-800">
                    New password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirm" className="text-sm font-medium text-gray-800">
                    Confirm new password
                  </label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update Password
                </Button>
              </form>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
