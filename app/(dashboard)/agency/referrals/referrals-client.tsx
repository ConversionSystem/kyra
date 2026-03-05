'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Copy, CheckCircle2, Gift, Users, TrendingUp, Zap, RefreshCw,
  Loader2, ExternalLink, ChevronRight, Trophy, Star, Flame, Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Referral {
  id: string;
  status: string;
  referred_email: string | null;
  created_at: string;
  referred_id: string | null;
  early_bird: boolean | null;
  referrer_credits_granted: number | null;
  friend_credits_granted: number | null;
}

interface Stats {
  total: number;
  signedUp: number;
  activated: number;
  weeklyCount: number;
  creditsEarned: number;
}

interface Props {
  agencyId: string;
  agencyName: string;
  agencyCreatedAt: string;
  referrals: Referral[];
  stats: Stats;
}

const statusColors: Record<string, string> = {
  pending:   'bg-gray-100 text-gray-600 border-gray-200',
  signed_up: 'bg-amber-50 text-amber-700 border-amber-200',
  activated: 'bg-green-50 text-green-700 border-green-200',
  converted: 'bg-green-50 text-green-700 border-green-200',
};

const statusLabels: Record<string, string> = {
  pending:   'Pending',
  signed_up: 'Joined — awaiting first message',
  activated: 'Active ✓',
  converted: 'Converted ⭐',
};

// Countdown timer (client-side only)
function EarlyBirdCountdown({ expiresAt }: { expiresAt: number }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) { setExpired(true); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(`${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
    };
    tick();
    const t = setInterval(tick, 1_000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (expired) return null;
  return (
    <span className="font-mono font-black text-indigo-700 text-lg tracking-wider">{timeLeft}</span>
  );
}

const SHARE_TABS = ['SMS / DM', 'Twitter/X', 'LinkedIn', 'Email'] as const;
type ShareTab = typeof SHARE_TABS[number];

const MILESTONES = [
  { count: 1,  label: 'Connector',     icon: Star,   bonus: null,          desc: 'First referral sent' },
  { count: 3,  label: 'Streak Bonus',  icon: Flame,  bonus: '+50 credits',  desc: '3 referrals in 7 days' },
  { count: 5,  label: 'Power Referrer',icon: Trophy, bonus: null,           desc: '5 total referrals' },
  { count: 10, label: 'Ambassador',    icon: Crown,  bonus: null,           desc: '10 total referrals' },
];

export default function ReferralsClient({ agencyId: _agencyId, agencyName, agencyCreatedAt, referrals, stats }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [inviteClicks, setInviteClicks] = useState(0);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [rotatingCode, setRotatingCode] = useState(false);
  const [activeTab, setActiveTab] = useState<ShareTab>('SMS / DM');

  const earlyBirdExpiresAt = new Date(agencyCreatedAt).getTime() + 48 * 3_600_000;
  const isEarlyBird = Date.now() < earlyBirdExpiresAt;
  const currentReferralCredits = isEarlyBird ? 150 : 100;

  const loadInvite = useCallback(() => {
    fetch('/api/agency/invite')
      .then(r => r.json())
      .then(d => { setInviteUrl(d.url ?? ''); setInviteClicks(d.clicks ?? 0); })
      .finally(() => setLoadingInvite(false));
  }, []);

  useEffect(() => { loadInvite(); }, [loadInvite]);

  const rotateCode = async () => {
    setRotatingCode(true);
    const res = await fetch('/api/agency/invite', { method: 'POST' });
    const d = await res.json();
    setInviteUrl(d.url ?? '');
    setInviteClicks(0);
    setRotatingCode(false);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const shareMessages: Record<ShareTab, string> = {
    'SMS / DM': `Hey — I've been using this to deploy AI workers for my business. Handles inbound messages in 60 seconds, books appointments, updates CRM automatically. You get 100 free AI credits just for signing up: ${inviteUrl}`,
    'Twitter/X': `🤖 Free OpenClaw AI tokens — just started using Kyra to deploy AI workers for my business. No code required. You get 100 free credits to try it: ${inviteUrl}`,
    'LinkedIn': `If you want AI workers handling client inbound without writing code, this is worth 5 minutes.\n\nI've been using Kyra to deploy AI workers — handles SMS in 60 seconds, books appointments, and updates CRM automatically.\n\n100 free AI credits to get started: ${inviteUrl}`,
    'Email': `Subject: 100 free AI credits (no card needed)\n\nHey,\n\nI'm using Kyra to deploy AI workers for my business — handles inbound messages in 60 seconds, books appointments, and updates CRM automatically. No code required.\n\nFree to start, here are 100 credits on me: ${inviteUrl}\n\n– ${agencyName}`,
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="h-6 w-6 text-indigo-500" />
          Referral Machine
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Share Kyra. You both get free AI credits — no purchase required.
        </p>
      </div>

      {/* ── Early Bird Banner ── */}
      {isEarlyBird && (
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-5">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-100/50 rounded-full -translate-y-12 translate-x-12" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-amber-600 font-bold text-sm uppercase tracking-wide">Early Bird Active</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <EarlyBirdCountdown expiresAt={earlyBirdExpiresAt} />
                <span className="text-gray-500 text-sm">remaining</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Refer now → <span className="font-bold text-indigo-700">150 credits</span> each
                <span className="text-gray-400 ml-1">(drops to 100 after timer)</span>
              </p>
            </div>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              onClick={() => copy(inviteUrl, 'early-bird')}
              disabled={!inviteUrl}
            >
              {copied === 'early-bird' ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Copied!</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy link</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── How it works ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { step: '1', icon: '🔗', title: 'Share your link', desc: 'Send it to anyone who could use AI workers for their business' },
          { step: '2', icon: '🙋', title: 'Friend signs up free', desc: 'They create a free account — no card required, no commitment' },
          { step: '3', icon: '🎁', title: 'You both get credits', desc: `You get ${currentReferralCredits} free AI credits. They get 100. Instantly.` },
        ].map(({ step, icon, title, desc }) => (
          <div key={step} className="bg-white border border-gray-200 rounded-xl p-4 relative">
            <div className="absolute -top-3 -left-1 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">{step}</div>
            <div className="text-2xl mb-2 mt-1">{icon}</div>
            <p className="font-semibold text-gray-900 text-sm mb-1">{title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Links clicked', value: stats.total, color: 'text-gray-600', bg: 'bg-gray-50' },
          { icon: TrendingUp, label: 'Activated (credits earned)', value: stats.activated, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Gift, label: 'Credits earned', value: stats.creditsEarned > 0 ? `${stats.creditsEarned.toLocaleString()}` : '—', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { icon: Flame, label: 'This week (streak)', value: `${stats.weeklyCount}/3`, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2.5">
                <div className={`rounded-lg ${bg} p-2`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <p className="text-xl font-black text-gray-900">{value}</p>
                  <p className="text-[11px] text-gray-400">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Referral Link + Share ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Your referral link
            {inviteClicks > 0 && (
              <span className="text-xs font-normal text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                👀 {inviteClicks} clicks
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Share this link. Both you and your friend get free AI credits the moment they sign up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Link row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono text-xs text-gray-700 truncate">
              {loadingInvite ? 'Generating your link...' : (inviteUrl || '...')}
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => copy(inviteUrl, 'link')} disabled={loadingInvite || !inviteUrl}>
              {copied === 'link' ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
            </Button>
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => window.open(inviteUrl, '_blank')} disabled={!inviteUrl} title="Preview">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="shrink-0 text-gray-400" onClick={rotateCode} disabled={rotatingCode} title="Generate new link">
              {rotatingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Share message tabs */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ready-to-send messages</p>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-3 overflow-x-auto">
              {SHARE_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="relative">
              <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-xl p-4 pr-12 max-h-40 overflow-y-auto">
                {shareMessages[activeTab]}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                onClick={() => copy(shareMessages[activeTab], `msg-${activeTab}`)}
              >
                {copied === `msg-${activeTab}` ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Quick social buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessages['Twitter/X'])}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-gray-800 transition"
            >
              <svg className="h-3.5 w-3.5 fill-white" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share on X
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareMessages['SMS / DM'])}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 text-[#16a34a] text-xs font-semibold hover:bg-[#25D366]/20 transition"
            >
              WhatsApp
            </a>
            <a
              href={`mailto:?subject=100+free+AI+credits&body=${encodeURIComponent(shareMessages['Email'])}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition"
            >
              Email
            </a>
            <a
              href={`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A66C2]/10 border border-[#0A66C2]/20 text-[#0A66C2] text-xs font-semibold hover:bg-[#0A66C2]/20 transition"
            >
              LinkedIn
            </a>
          </div>
        </CardContent>
      </Card>

      {/* ── Milestones ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Milestones
          </CardTitle>
          <CardDescription className="text-xs">Unlock rewards as you refer more friends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MILESTONES.map(({ count, label, icon: Icon, bonus, desc }) => {
              const achieved = stats.total >= count || (count === 3 && stats.weeklyCount >= 3);
              return (
                <div key={count} className={`flex items-center gap-3 p-3 rounded-xl border transition ${achieved ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${achieved ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Icon className={`h-4 w-4 ${achieved ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${achieved ? 'text-green-800' : 'text-gray-700'}`}>{label}</p>
                      {bonus && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">{bonus}</span>}
                    </div>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  <div className="shrink-0">
                    {achieved
                      ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                      : <ChevronRight className="h-4 w-4 text-gray-300" />
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Referrals table ── */}
      {referrals.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your referrals ({referrals.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {referrals.map(ref => (
                <div key={ref.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-gray-900 truncate">{ref.referred_email || 'Anonymous'}</p>
                      {ref.early_bird && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                          <Zap className="h-2.5 w-2.5" />Early Bird
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-gray-400">
                        {new Date(ref.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {ref.referrer_credits_granted ? (
                        <span className="text-xs text-indigo-600 font-medium">+{ref.referrer_credits_granted} credits earned</span>
                      ) : null}
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusColors[ref.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {statusLabels[ref.status] || ref.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Gift className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No referrals yet</p>
            <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">Copy your link above and share it. You both get free AI credits the moment they join.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
