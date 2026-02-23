'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, CheckCircle, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  token: string;
  invite: {
    id: string;
    client_id: string;
    email: string;
    role: string;
    expires_at: string;
    accepted_at: string | null;
  } | null;
  client: { id: string; name: string; industry: string } | null;
  branding: { name: string; logoUrl: string | null; primaryColor: string };
  userEmail: string;
}

export default function AcceptInviteClient({ token, invite, client, branding, userEmail }: Props) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Invalid / expired states
  if (!invite) {
    return <InviteError title="Invalid invite link" message="This invite link doesn't exist or has already been deleted." />;
  }
  if (invite.accepted_at) {
    return <InviteError title="Already accepted" message="This invite link has already been used." actionHref={`/client-portal/${invite.client_id}`} actionLabel="Go to portal" />;
  }
  if (new Date(invite.expires_at) < new Date()) {
    return <InviteError title="Invite expired" message="This invite link expired. Ask your agency to send a new one." />;
  }
  if (invite.email && invite.email !== userEmail.toLowerCase()) {
    return <InviteError title="Wrong account" message={`This invite was sent to ${invite.email}. Please sign in with that account.`} />;
  }

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      const res = await fetch('/api/portal/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to accept invite');
      setDone(true);
      setTimeout(() => router.push(data.redirectTo), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setAccepting(false);
    }
  };

  if (done) {
    return (
      <InviteLayout branding={branding}>
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re in! 🎉</h2>
          <p className="text-gray-500 text-sm">Redirecting to your AI portal…</p>
        </div>
      </InviteLayout>
    );
  }

  return (
    <InviteLayout branding={branding}>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-100 mb-4">
          <Shield className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          You&apos;ve been invited!
        </h2>
        <p className="text-gray-500 text-sm">
          <strong>{branding.name}</strong> has invited you to view the AI portal for:
        </p>
      </div>

      {client && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {client.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
            <p className="text-xs text-gray-500">{client.industry} · {invite.role} access</p>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-6 text-sm text-gray-600">
        <p className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
          View your AI employee&apos;s performance
        </p>
        <p className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
          See conversation volume and response stats
        </p>
        <p className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
          Access your monthly performance report
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button onClick={handleAccept} disabled={accepting} className="w-full" size="lg">
        {accepting ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Accepting…</>
        ) : (
          'Accept & View Portal'
        )}
      </Button>

      <p className="text-xs text-gray-400 text-center mt-4">
        Signed in as {userEmail}
      </p>
    </InviteLayout>
  );
}

function InviteLayout({ branding, children }: { branding: Props['branding']; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        {/* Brand header */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.name} className="h-7 object-contain" />
          ) : (
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {branding.name.charAt(0)}
            </div>
          )}
          <span className="text-sm font-semibold text-gray-900">{branding.name}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function InviteError({ title, message, actionHref, actionLabel }: {
  title: string; message: string; actionHref?: string; actionLabel?: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        {actionHref && (
          <a href={actionHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            {actionLabel ?? 'Continue'} →
          </a>
        )}
      </div>
    </div>
  );
}
