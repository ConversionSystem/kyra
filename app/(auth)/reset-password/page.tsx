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
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>}>
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
  // Start as null (checking), true (recovery session active), false (no session)
  const [ready, setReady] = useState<boolean | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event — fires when Supabase processes
    // the recovery token from the URL hash. This is the correct approach
    // because getSession() runs before the hash is parsed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
      }
    });

    // Also check if there's already an active session (e.g. page refresh)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      } else {
        // Give onAuthStateChange 2s to fire before declaring invalid
        setTimeout(() => {
          setReady(prev => prev === null ? false : prev);
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
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

  // Still waiting for auth state
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

          {/* Invalid / expired link */}
          {!ready && !done && (
            <div className="text-center space-y-4">
              <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">Reset link not detected</p>
                <p>This can happen if the link expired, was already used, or you opened it in a different browser. Request a fresh link below.</p>
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
