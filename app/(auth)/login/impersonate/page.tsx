'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, KeyRound, AlertTriangle } from 'lucide-react';

function ImpersonateContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('e') || '';
  const password = searchParams.get('p') || '';
  const name = searchParams.get('n') || 'user';
  
  const [status, setStatus] = useState('Signing out current session...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email || !password) {
      setError('Missing credentials');
      return;
    }

    const doLogin = async () => {
      try {
        const supabase = createClient();
        
        // Sign out any existing session in this tab
        setStatus('Signing out current session...');
        await supabase.auth.signOut();
        
        // Small delay to ensure signout completes
        await new Promise(r => setTimeout(r, 500));
        
        // Sign in as the target user
        setStatus(`Logging in as ${email}...`);
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        setStatus('Redirecting to dashboard...');
        
        // Clear the URL params (security — don't leave password in URL)
        window.history.replaceState({}, '', '/login/impersonate');
        
        // Redirect to dashboard
        window.location.href = '/agency';
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    };

    doLogin();
  }, [email, password]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-sm">
        {error ? (
          <>
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Login Failed</h2>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <a href="/master/accounts" className="text-sm text-indigo-600 hover:underline">
              ← Back to Admin
            </a>
          </>
        ) : (
          <>
            <div className="bg-indigo-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Logging in as {name}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{status}</p>
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600 mx-auto" />
          </>
        )}
      </div>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    }>
      <ImpersonateContent />
    </Suspense>
  );
}
