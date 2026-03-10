'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Copy, CheckCircle2, Gift, Users, TrendingUp, Zap, RefreshCw,
  Loader2, ExternalLink, ChevronRight, Trophy, Star, Flame, Crown,
  MessageCircle, Mail, Linkedin, Twitter, Share2, Sparkles,
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
  inviteClicks: number;
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
  signed_up: 'Joined',
  activated: 'Active ✓',
  converted: 'Converted ⭐',
};

// Live early-bird countdown
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
  return <span className="font-mono font-black text-indigo-700 text-xl tracking-wider">{timeLeft}</span>;
}

const SHARE_TABS = ['SMS / DM', 'Email', 'Twitter / X', 'LinkedIn', 'WhatsApp'] as const;
type ShareTab = typeof SHARE_TABS[number];

const SHARE_TAB_ICONS: Record<ShareTab, React.ElementType> = {
  'SMS / DM':   MessageCircle,
  'Email':      Mail,
  'Twitter / X': Twitter,
  'LinkedIn':   Linkedin,
  'WhatsApp':   Share2,
};

const MILESTONES = [
  { count: 1,  label: 'First Referral',  icon: Star,   bonus: null,          desc: 'Send your first invite and earn credits' },
  { count: 3,  label: 'Streak Bonus',    icon: Flame,  bonus: '+50 credits',  desc: '3 referrals in a single week' },
  { count: 5,  label: 'Power Referrer',  icon: Trophy, bonus: null,           desc: '5 activated referrals' },
  { count: 10, label: 'Kyra Ambassador', icon: Crown,  bonus: 'VIP status',   desc: '10 activated referrals' },
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
  const streakProgress = Math.min(stats.weeklyCount, 3);

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
      setTimeout(() => setCopied(null), 2500);
    });
  };

  // ── Conversion-optimized share messages ──────────────────────────────────
  const shareMessages: Record<ShareTab, string> = {

    'SMS / DM':
`Hey — quick thing I think you'd actually use.

I've been running an AI worker on my business for a few weeks now. It responds to every inbound message in under 60 seconds, handles appointment booking, and keeps the CRM updated — all while I'm doing other things.

Took maybe 20 minutes to set up. No code.

Here are 100 free credits to try it yourself — no card required:
${inviteUrl}

Genuinely worth 5 minutes.`,

    'Email':
`Subject: My AI worker responds to clients in 60 seconds (100 free credits for you)

Hey,

I've been using an AI platform called Kyra that's completely changed how I handle client communications — and I think it could do the same for you.

Here's what it does on autopilot:
• Responds to every inbound message in under 60 seconds, 24/7
• Books appointments and sends confirmations automatically
• Updates your CRM with contact info — no manual entry
• Follows up on leads before they go cold
• Works across SMS, web chat, WhatsApp, and more

Setup takes about 20 minutes. Zero code required.

I have 100 free AI credits to give you — no card needed, cancel anytime. Just sign up and start testing:

${inviteUrl}

Happy to walk you through it if you want. Let me know what you think.

— ${agencyName}`,

    'Twitter / X':
`My AI worker is handling client inbound 24/7 while I focus on the actual work.

60-second response time. Auto-books appointments. Updates CRM automatically.

No code. No extra staff. Just works.

100 free credits if you want to try it: ${inviteUrl}`,

    'LinkedIn':
`One of the best decisions I've made for my business this year: deploying an AI worker.

I was spending hours every week on inbound messages, appointment confirmations, and CRM updates. Work that felt important but wasn't moving the needle.

Now Kyra handles all of it automatically:
→ Responds to every inquiry within 60 seconds (including nights and weekends)
→ Books appointments directly into my calendar
→ Captures and logs contact info without manual entry
→ Follows up on leads that would have gone cold

Setup was around 20 minutes. No developers. No code.

If you're running a business that gets inbound communications and you're still handling it manually — I genuinely think this is worth your time.

Here are 100 free AI credits to try it yourself:
${inviteUrl}`,

    'WhatsApp':
`Hey! 👋

This made a real difference for me so thought I'd pass it along —

I've been using an AI worker to handle all my client messages, and it's been a game changer. Responds in under 60 seconds, books appointments, updates my CRM. All automatic.

Zero setup headache and zero code involved.

Here's 100 free credits to try it — no card needed:
${inviteUrl}

Worth checking out 🤙`,
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="h-6 w-6 text-indigo-500" />
            Referral Machine
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Share Kyra with people who'd benefit. You both get free AI credits — instantly, no purchase needed.
          </p>
        </div>
        {stats.creditsEarned > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-2xl font-black text-indigo-600">+{stats.creditsEarned}</p>
            <p className="text-xs text-gray-400">credits earned</p>
          </div>
        )}
      </div>

      {/* ── Early Bird Banner ── */}
      {isEarlyBird && (
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-5 sm:p-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-100/30 rounded-full -translate-y-16 translate-x-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-100/30 rounded-full translate-y-12 -translate-x-12 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1.5 bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                  <Zap className="h-3 w-3" />
                  Early Bird Window Open
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <EarlyBirdCountdown expiresAt={earlyBirdExpiresAt} />
                <span className="text-gray-400 text-sm">remaining</span>
              </div>
              <p className="text-sm text-gray-600">
                Refer now and earn{' '}
                <span className="font-black text-indigo-700 text-base">150 credits</span>
                {' '}per referral
                <span className="text-gray-400 ml-1">(drops to 100 after window closes)</span>
              </p>
            </div>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-md shadow-indigo-200"
              onClick={() => copy(inviteUrl, 'early-bird')}
              disabled={!inviteUrl}
            >
              {copied === 'early-bird'
                ? <><CheckCircle2 className="h-4 w-4 mr-1.5" />Copied!</>
                : <><Copy className="h-4 w-4 mr-1.5" />Copy my link</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── How it works ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            step: '1',
            emoji: '🔗',
            title: 'Share your link',
            desc: 'Send it to anyone running a business that handles client messages — agencies, consultants, service businesses.',
          },
          {
            step: '2',
            emoji: '🙋',
            title: 'They sign up free',
            desc: 'No credit card required. They start a free trial in under 2 minutes and get 100 credits to explore.',
          },
          {
            step: '3',
            emoji: '🎁',
            title: 'You both get credits',
            desc: `You get ${currentReferralCredits} AI credits. They get 100. Both deposited instantly when they sign up.`,
          },
        ].map(({ step, emoji, title, desc }) => (
          <div key={step} className="relative bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-100 hover:shadow-sm transition-all">
            <div className="absolute -top-3 left-4 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow">{step}</div>
            <div className="text-3xl mb-3 mt-1">{emoji}</div>
            <p className="font-semibold text-gray-900 text-sm mb-1">{title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users,    label: 'Link clicks',    value: inviteClicks > 0 ? inviteClicks : (stats.total > 0 ? '—' : 0),  color: 'text-gray-700',   bg: 'bg-gray-100',   border: 'border-gray-200'   },
          { icon: TrendingUp, label: 'Signed up',    value: stats.total,                                                     color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-100'   },
          { icon: Gift,     label: 'Credits earned', value: stats.creditsEarned > 0 ? `+${stats.creditsEarned}` : 0,        color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-100' },
          { icon: Flame,    label: 'Week streak',    value: `${streakProgress}/3`,                                           color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-100' },
        ].map(({ icon: Icon, label, value, color, bg, border }) => (
          <div key={label} className={`bg-white border ${border} rounded-xl p-4 flex items-center gap-3`}>
            <div className={`rounded-lg ${bg} p-2.5 shrink-0`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black text-gray-900 leading-none">{value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Referral Link + Share Messages ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Your referral link</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Share this link. You get {currentReferralCredits} credits and your friend gets 100 — the moment they sign up.
              </CardDescription>
            </div>
            {inviteClicks > 0 && (
              <span className="shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                👀 {inviteClicks} {inviteClicks === 1 ? 'view' : 'views'}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Link row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-mono text-xs text-gray-700 truncate min-w-0">
              {loadingInvite ? '⏳  Generating your link...' : (inviteUrl || '—')}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              onClick={() => copy(inviteUrl, 'link')}
              disabled={loadingInvite || !inviteUrl}
            >
              {copied === 'link'
                ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />Copied</>
                : <><Copy className="h-3.5 w-3.5" />Copy</>}
            </Button>
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => window.open(inviteUrl, '_blank')} disabled={!inviteUrl} title="Preview link">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="shrink-0 text-gray-400 hover:text-gray-600" onClick={rotateCode} disabled={rotatingCode} title="Generate a new link">
              {rotatingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Share message tabs */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                Ready-to-send messages
              </p>
              <p className="text-[10px] text-gray-400">Tap to select · copy to send</p>
            </div>

            {/* Tab row */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-3 overflow-x-auto">
              {SHARE_TABS.map(tab => {
                const TabIcon = SHARE_TAB_ICONS[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      activeTab === tab
                        ? 'bg-white shadow-sm text-indigo-700 font-semibold'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <TabIcon className="h-3 w-3 shrink-0" />
                    <span className="hidden sm:inline">{tab}</span>
                    <span className="sm:hidden">{tab.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Message box */}
            <div className="relative group">
              <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-xl p-4 pr-10 max-h-52 overflow-y-auto font-sans">
                {shareMessages[activeTab]}
              </pre>
              <button
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                onClick={() => copy(shareMessages[activeTab], `msg-${activeTab}`)}
                title="Copy message"
              >
                {copied === `msg-${activeTab}`
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Copy message CTA */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-2"
              onClick={() => copy(shareMessages[activeTab], `msg-${activeTab}`)}
            >
              {copied === `msg-${activeTab}`
                ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />Message copied — paste and send</>
                : <><Copy className="h-3.5 w-3.5" />Copy {activeTab} message</>}
            </Button>
          </div>

          {/* One-click share buttons */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Share directly</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessages['Twitter / X'])}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-colors shadow-sm"
              >
                <svg className="h-3.5 w-3.5 fill-white shrink-0" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Post on X
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareMessages['WhatsApp'])}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#16a34a] text-xs font-semibold hover:bg-[#22c55e]/20 transition-colors"
              >
                <svg className="h-3.5 w-3.5 fill-[#16a34a] shrink-0" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent('100 free AI credits — no card needed')}&body=${encodeURIComponent(shareMessages['Email'])}`}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                Email
              </a>
              <a
                href={`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0A66C2]/10 border border-[#0A66C2]/20 text-[#0A66C2] text-xs font-semibold hover:bg-[#0A66C2]/20 transition-colors"
              >
                <Linkedin className="h-3.5 w-3.5 shrink-0" />
                LinkedIn
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Weekly Streak Progress ── */}
      <Card className="shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-gray-800">Weekly Streak</span>
              {stats.weeklyCount >= 3 && (
                <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-bold">+50 BONUS ✓</span>
              )}
            </div>
            <span className="text-sm font-bold text-gray-700">{streakProgress}<span className="text-gray-400 font-normal">/3</span></span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`flex-1 h-2.5 rounded-full transition-all ${
                  i <= streakProgress
                    ? 'bg-gradient-to-r from-orange-400 to-amber-500'
                    : 'bg-gray-100 border border-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {streakProgress >= 3
              ? '🔥 Streak bonus unlocked! +50 extra credits earned this week.'
              : `Refer ${3 - streakProgress} more ${3 - streakProgress === 1 ? 'person' : 'people'} this week to unlock the +50 credit streak bonus.`}
          </p>
        </CardContent>
      </Card>

      {/* ── Milestones ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Milestones
          </CardTitle>
          <CardDescription className="text-xs">Unlock rewards as you refer more friends and grow your network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {MILESTONES.map(({ count, label, icon: Icon, bonus, desc }) => {
              const achieved = stats.activated >= count || (count === 3 && stats.weeklyCount >= 3);
              return (
                <div key={count} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  achieved
                    ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50'
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${achieved ? 'bg-green-100' : 'bg-white border border-gray-200'}`}>
                    <Icon className={`h-4 w-4 ${achieved ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${achieved ? 'text-green-800' : 'text-gray-700'}`}>{label}</p>
                      {bonus && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          achieved
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>{bonus}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {achieved ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">{stats.activated}/{count}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Referrals list ── */}
      {referrals.length > 0 ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Your referrals</CardTitle>
              <span className="text-xs text-gray-400 font-medium">{referrals.length} total</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {referrals.map(ref => (
                <div key={ref.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{ref.referred_email || 'Anonymous'}</p>
                      {ref.early_bird && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">
                          <Zap className="h-2.5 w-2.5" />Early Bird
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <p className="text-xs text-gray-400">
                        {new Date(ref.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {ref.referrer_credits_granted ? (
                        <span className="text-xs text-indigo-600 font-semibold">+{ref.referrer_credits_granted} credits</span>
                      ) : null}
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border shrink-0 ${statusColors[ref.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {statusLabels[ref.status] || ref.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Gift className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="text-gray-800 font-semibold text-base">No referrals yet — you're leaving credits on the table</p>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            Copy your link above and send the ready-made message to one person. Takes 30 seconds. You both get free credits the moment they join.
          </p>
          <Button
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            onClick={() => copy(inviteUrl, 'empty-state')}
            disabled={!inviteUrl}
          >
            {copied === 'empty-state'
              ? <><CheckCircle2 className="h-4 w-4 mr-1.5 text-green-300" />Link copied!</>
              : <><Copy className="h-4 w-4 mr-1.5" />Copy referral link</>}
          </Button>
        </div>
      )}

    </div>
  );
}
