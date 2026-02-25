'use client';

import { useState, useEffect } from 'react';
import { Copy, CheckCircle2, Gift, Users, DollarSign, TrendingUp, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Referral {
  id: string;
  status: string;
  referred_email: string | null;
  created_at: string;
  referred_id: string | null;
}

interface Props {
  agencyId: string;
  agencyName: string;
  referrals: Referral[];
  stats: { total: number; signedUp: number; converted: number };
}

const statusColors: Record<string, string> = {
  pending:   'bg-gray-100 text-gray-600',
  signed_up: 'bg-blue-100 text-blue-700',
  converted: 'bg-green-100 text-green-700',
  paid_out:  'bg-purple-100 text-purple-700',
};

const statusLabels: Record<string, string> = {
  pending:   'Pending',
  signed_up: 'Signed Up',
  converted: '✅ Converted',
  paid_out:  '💰 Paid Out',
};

export default function ReferralsClient({ agencyId: _agencyId, agencyName, referrals, stats }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [inviteClicks, setInviteClicks] = useState(0);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [rotatingCode, setRotatingCode] = useState(false);

  useEffect(() => {
    fetch('/api/agency/invite')
      .then((r) => r.json())
      .then((d) => { setInviteUrl(d.url ?? ''); setInviteClicks(d.clicks ?? 0); })
      .finally(() => setLoadingInvite(false));
  }, []);

  const rotateCode = async () => {
    setRotatingCode(true);
    const res = await fetch('/api/agency/invite', { method: 'POST' });
    const d = await res.json();
    setInviteUrl(d.url ?? '');
    setInviteClicks(0);
    setRotatingCode(false);
  };

  const refUrl = inviteUrl;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const creditsEarned = (stats.signedUp + stats.converted) * 500;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="h-6 w-6 text-indigo-500" />
          Referral Program
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Refer other agencies to Kyra. Earn <strong>500 credits ($5)</strong> the moment they sign up — no purchase required.
        </p>
      </div>

      {/* Reward banner */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-4xl">🪙</div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-lg">500 credits per referral — instant, automatic</p>
              <p className="text-sm text-gray-600 mt-1">
                Share your link. The moment any agency signs up through it, you get 500 Kyra Credits ($5) automatically — no waiting for them to upgrade or pay.
                Refer 20 agencies → 10,000 credits ($100) free.
              </p>
            </div>
            {(stats.signedUp > 0 || stats.converted > 0) && (
              <div className="text-right shrink-0">
                <p className="text-3xl font-black text-indigo-700">{((stats.signedUp + stats.converted) * 500).toLocaleString()}</p>
                <p className="text-xs text-gray-500">credits earned so far</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total referred', value: stats.total, color: 'text-gray-600' },
          { icon: TrendingUp, label: 'Signed up', value: stats.signedUp, color: 'text-blue-600' },
          { icon: CheckCircle2, label: 'Converted', value: stats.converted, color: 'text-green-600' },
          { icon: DollarSign, label: 'Credits earned', value: creditsEarned > 0 ? `${creditsEarned.toLocaleString()} 🪙` : '—', color: 'text-purple-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your referral link</CardTitle>
          <CardDescription className="text-xs">
            Share this with other GHL agency owners. When they sign up and upgrade, you earn a free month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Invite clicks stat */}
          {inviteClicks > 0 && (
            <div className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5 mb-2">
              👀 {inviteClicks} people clicked your invite link
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono text-xs text-gray-700 truncate">
              {loadingInvite ? 'Generating your link...' : (refUrl || 'Loading...')}
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => copy(refUrl, 'link')} disabled={loadingInvite || !refUrl}>
              {copied === 'link' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === 'link' ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => window.open(refUrl, '_blank')} disabled={!refUrl}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="shrink-0 text-gray-400 hover:text-gray-600" onClick={rotateCode} disabled={rotatingCode} title="Generate new link">
              {rotatingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Share templates */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Quick share messages</p>
            <div className="space-y-2">
              {[
                {
                  key: 'sms',
                  label: 'SMS / DM',
                  text: `Hey! I've been using this AI workforce platform for my agency clients — responds to SMS in 60 seconds, books appointments, updates GHL automatically. Sign up free and get $2 in credits to test it: ${refUrl}`,
                },
                {
                  key: 'email',
                  label: 'Cold Email',
                  text: `Subject: AI worker for your GHL clients (60-sec SMS response)\n\nHey [Name],\n\nQuick one — I've been using a tool called Kyra that plugs into any GHL sub-account and acts as an AI worker. It:\n\n• Replies to every inbound SMS in under 60 seconds\n• Books appointments directly in GHL calendar\n• Tags and updates contacts automatically\n• Works for any industry (dental, real estate, cannabis, etc.)\n\nFree to start — you get $2 in credits just for signing up, no card required:\n${refUrl}\n\n[Your name]`,
                },
                {
                  key: 'linkedin',
                  label: 'LinkedIn / Facebook',
                  text: `🤖 Been testing an AI workforce platform for GHL agencies and the results are legit.\n\nKyra plugs into any sub-account and handles inbound SMS within 60 seconds — books appointments, tags contacts, the whole thing. Works across dental, real estate, cannabis, and more.\n\nIf you're running a GHL agency, worth checking out. They give you $2 free to test:\n${refUrl}`,
                },
              ].map(({ key, label, text }) => (
                <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                    <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 px-2" onClick={() => copy(text, key)}>
                      {copied === key ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      {copied === key ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals table */}
      {referrals.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your referrals ({referrals.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {referrals.map(ref => (
                <div key={ref.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{ref.referred_email || '—'}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(ref.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${statusColors[ref.status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabels[ref.status] || ref.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Gift className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No referrals yet</p>
            <p className="text-gray-400 text-sm mt-1">Copy your referral link above and share it with other GHL agencies.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
