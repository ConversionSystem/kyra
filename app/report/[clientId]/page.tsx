'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { Zap, MessageSquare, Clock, CheckCircle2, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';

interface Report {
  client: { id: string; name: string; industry: string; since: string };
  period: string;
  branding?: { name: string; logoUrl: string | null; primaryColor: string };
  stats: {
    total_conversations: number;
    escalations: number;
    resolution_rate: number;
    avg_response_seconds: number;
    channels_active: number;
    channel_breakdown: Record<string, number>;
    hours_saved?: number;
  };
  sparkline: { date: string; count: number }[];
  generated_at: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  ghl_sms: 'SMS',
  web_chat: 'Web Chat',
  whatsapp_direct: 'WhatsApp',
  email: 'Email',
  voice: 'Voice',
};

const INDUSTRY_EMOJIS: Record<string, string> = {
  dental: '🦷', realestate: '🏡', auto: '🚗', cannabis: '🌿',
  restaurant: '🍽️', medspa: '✨', law: '⚖️', fitness: '💪', default: '🤖',
};

function Sparkline({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const width = 200;
  const height = 48;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d.count / max) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (d.count / max) * (height - 8) - 4;
        return <circle key={i} cx={x} cy={y} r="3" fill="#6366f1" />;
      })}
    </svg>
  );
}

export default function ReportPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/report/${clientId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setReport)
      .catch(() => setError(true));
  }, [clientId]);

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 text-lg mb-2">Report not found</p>
        <Link href="/" className="text-indigo-600 hover:underline text-sm">← Go to Kyra AI</Link>
      </div>
    </div>
  );

  if (!report) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
    </div>
  );

  const { client, stats, sparkline, branding } = report;
  const agencyName = branding?.name ?? 'Kyra AI';
  const brandColor = branding?.primaryColor ?? '#4f46e5';
  const emoji = INDUSTRY_EMOJIS[client.industry?.toLowerCase()] ?? INDUSTRY_EMOJIS.default;
  const since = new Date(client.since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const statCards = [
    {
      icon: MessageSquare, label: 'Conversations Handled', value: stats.total_conversations.toLocaleString(),
      sub: 'Last 30 days', color: 'text-indigo-600', bg: 'bg-indigo-50',
    },
    {
      icon: Clock, label: 'Avg Response Time', value: `${stats.avg_response_seconds}s`,
      sub: 'vs. industry avg 4+ hours', color: 'text-green-600', bg: 'bg-green-50',
    },
    {
      icon: CheckCircle2, label: 'Resolution Rate', value: `${stats.resolution_rate}%`,
      sub: 'Resolved without human', color: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      icon: AlertTriangle, label: 'Escalations', value: stats.escalations.toLocaleString(),
      sub: 'Handed to human team', color: 'text-amber-600', bg: 'bg-amber-50',
    },
    ...(stats.hours_saved
      ? [{
          icon: TrendingUp, label: 'Staff Hours Saved', value: `${stats.hours_saved}h`,
          sub: 'Estimated at 4.5 min/conversation', color: 'text-purple-600', bg: 'bg-purple-50',
        }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Agency brand bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={agencyName} className="h-7 w-auto max-w-[120px] object-contain" />
          ) : (
            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: brandColor }}>
              {agencyName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-sm text-gray-800">{agencyName}</span>
        </div>
        <span className="text-xs text-gray-400">AI Performance Report</span>
      </div>

      {/* Header */}
      <div className="text-white px-6 py-12 text-center" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}>
        <div className="text-5xl mb-3">{emoji}</div>
        <h1 className="text-3xl font-black mb-1">{client.name}</h1>
        <p className="text-white/80 text-sm">AI Employee Performance Report · Last 30 Days</p>
        <p className="text-white/60 text-xs mt-1">Active since {since}</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {statCards.map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className={`inline-flex p-2 rounded-xl ${s.bg} mb-3`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-3xl font-black text-gray-900 mb-1">{s.value}</p>
              <p className="text-sm font-semibold text-gray-700">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Sparkline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-gray-900">Daily Conversations</p>
              <p className="text-xs text-gray-400">Last 7 days</p>
            </div>
            <TrendingUp className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex items-end gap-4">
            <Sparkline data={sparkline} />
            <div className="text-right">
              <p className="text-2xl font-black text-indigo-600">{sparkline.reduce((s, d) => s + d.count, 0)}</p>
              <p className="text-xs text-gray-400">this week</p>
            </div>
          </div>
          <div className="flex justify-between mt-2">
            {sparkline.map(d => (
              <span key={d.date} className="text-xs text-gray-300">
                {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            ))}
          </div>
        </div>

        {/* Channels */}
        {Object.keys(stats.channel_breakdown).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-8">
            <p className="font-bold text-gray-900 mb-4">Channels Active</p>
            <div className="space-y-2">
              {Object.entries(stats.channel_breakdown).map(([ch, count]) => {
                const pct = Math.round((count / stats.total_conversations) * 100);
                return (
                  <div key={ch}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{CHANNEL_LABELS[ch] ?? ch}</span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-8">
          <p className="font-bold text-indigo-900 mb-2">📊 30-Day Summary</p>
          <p className="text-indigo-800 text-sm leading-relaxed">
            In the last 30 days, <strong>{client.name}&apos;s</strong> AI employee handled{' '}
            <strong>{stats.total_conversations.toLocaleString()} conversations</strong> with an average response
            time of <strong>{stats.avg_response_seconds} seconds</strong> — compared to the industry average
            of 4+ hours. <strong>{stats.resolution_rate}%</strong> were resolved without any human involvement.
            {stats.escalations > 0 &&
              ` ${stats.escalations} conversation${stats.escalations > 1 ? 's' : ''} were escalated to the human team.`}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-200 pt-8">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            <span>Report by <strong className="text-gray-700">{agencyName}</strong>{branding?.name && branding.name !== 'Kyra AI' ? '' : <> · <Link href="https://kyra.conversionsystem.com" className="text-indigo-500 hover:underline">Kyra AI</Link></>}</span>
          </div>
          <p className="text-xs text-gray-400">
            Report generated {new Date(report.generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <Link href="https://kyra.conversionsystem.com/try/dental"
            className="inline-flex items-center gap-2 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm">
            Try Kyra for your business →
          </Link>
        </div>
      </div>
    </div>
  );
}
