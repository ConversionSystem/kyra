'use client';

/**
 * /auth/confirm
 *
 * Lands Supabase magic-link redirects when the project is configured for the
 * IMPLICIT flow (tokens come back in the URL hash fragment, not as ?code=).
 *
 * Used by:
 *   - /api/admin/accounts/[id]/login-as   (master impersonation)
 *   - /api/master/impersonate             (master impersonation, alt path)
 *   - any other admin.generateLink() caller whose project isn't on PKCE
 *
 * Why this exists:
 *   /api/auth/callback is a server route that runs exchangeCodeForSession()
 *   on the ?code= query param. That's the PKCE flow. Implicit-flow Supabase
 *   returns tokens in the URL hash (#access_token=...&refresh_token=...),
 *   which the server can't read — hash fragments are never sent to the
 *   server. This page reads the hash in the browser, calls setSession(),
 *   then redirects to the final destination.
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, KeyRound, AlertTriangle } from 'lucide-react';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next') || '/agency';
  // Only allow internal paths to prevent open redirect.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/agency';

  const [status, setStatus] = useState('Completing sign-in…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      // Hash fragments aren't in useSearchParams — read window.location.hash.
      const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
      if (!hash) {
        setError('Missing authentication tokens. The link may have expired.');
        return;
      }

      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const hashError = params.get('error');
      const hashErrorDesc = params.get('error_description');

      if (hashError) {
        setError(hashErrorDesc ? hashErrorDesc.replace(/\+/g, ' ') : hashError);
        return;
      }

      if (!accessToken || !refreshToken) {
        setError('Incomplete auth payload. Missing access or refresh token.');
        return;
      }

      setStatus('Establishing session…');
      const supabase = createClient();

      // Sign out any existing session in THIS tab so setSession overwrites
      // cleanly. Supabase cookies are shared across tabs at the same origin;
      // admins should use an incognito window if they want to keep their
      // master session alive in another tab.
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // best-effort
      }

      const { error: setErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (setErr) {
        setError(setErr.message);
        return;
      }

      setStatus('Redirecting…');

      // Remove the hash before navigating so tokens don't leak into referrers
      // or browser history.
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        // best-effort
      }

      // Full navigation so server components pick up the new auth cookies.
      window.location.replace(next);
    };

    run();
  }, [next]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {error ? (
          <>
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Sign-in failed</h2>
            <p className="text-sm text-red-600 mb-4 break-words">{error}</p>
            <a href="/master/accounts" className="text-sm text-indigo-600 hover:underline">
              ← Back to Admin
            </a>
          </>
        ) : (
          <>
            <div className="bg-indigo-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Signing you in</h2>
            <p className="text-sm text-gray-500 mb-4">{status}</p>
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600 mx-auto" />
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}
