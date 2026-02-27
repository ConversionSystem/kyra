'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Users, MessageSquare, Calendar, Trophy,
  Bot, Zap, ArrowRight, Target, Loader2, ChevronDown,
  Mail, Phone, RefreshCw, Sparkles, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Overview {
  total_campaigns: number;
  active_campaigns: number;
  total_leads: number;
  total_messaged: number;
  total_replied: number;
  total_booked: number;
  total_closed: number;
  response_rate: number;
  booking_rate: number;
}

interface FunnelStep {
  stage: string;
  count: number;
  label: string;
}

interface CampaignMetric {
  id: string;
  name: string;
  status: string;
  industry: string | null;
  location: string | null;
  created_at: string;
  total_leads: number;
  messaged: number;
  replied: number;
  interested: number;
  booked: number;
  closed: number;
  skipped: number;
  response_rate: number;
  booking_rate: number;
}

interface FollowUpStat {
  follow_up_number: number;
  sent: number;
  replied: number;
  rate: number;
}

interface ChannelPerformance {
  sms: { sent: number; replied: number; rate: number };
  email: { sent: number; replied: number; rate: number };
}

interface CloserStats {
  total_responses: number;
  openclaw_powered: number;
  direct_llm: number;
  stages_updated: number;
}

interface DailyActivity {
  date: string;
  created: number;
  messaged: number;
  replied: number;
}

interface AnalyticsData {
  overview: Overview;
  funnel: FunnelStep[];
  campaigns: CampaignMetric[];
  follow_up_effectiveness: FollowUpStat[];
  channel_performance: ChannelPerformance;
  closer_stats: CloserStats;
  daily_activity: DailyActivity[];
}

// ─── Color Palette ────────────────────────────────────────────────────────────

const FUNNEL_COLORS = [
  'bg-blue-500',      // Found
  'bg-cyan-500',      // Approved
  'bg-purple-500',    // Researched
  'bg-indigo-500',    // Messaged
  'bg-amber-500',     // Replied
  'bg-orange-500',    // Interested
  'bg-green-500',     // Booked
  'bg-emerald-500',   // Closed
];

const FOLLOW_UP_LABELS: Record<number, string> = {
  1: 'Gentle Bump',
  2: 'New Angle',
  3: 'Social Proof',
  4: 'Urgency',
  5: 'Breakup',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PipelineAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/pipeline/analytics?days=${days}`);
      if (!res.ok) throw new Error('Failed to load analytics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading analytics...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-red-500">{error || 'Failed to load analytics'}</p>
        <button onClick={fetchAnalytics} className="mt-2 text-sm text-primary hover:underline">Retry</button>
      </div>
    );
  }

  const { overview, funnel, campaigns, follow_up_effectiveness, channel_performance, closer_stats, daily_activity } = data;

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pipeline Analytics</h2>
          <p className="text-sm text-gray-500">Track campaign performance and conversion rates</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Leads"
          value={overview.total_leads}
          icon={Users}
          color="blue"
          subtitle={`${overview.total_campaigns} campaign${overview.total_campaigns !== 1 ? 's' : ''}`}
        />
        <KpiCard
          title="Messaged"
          value={overview.total_messaged}
          icon={MessageSquare}
          color="indigo"
          subtitle={`of ${overview.total_leads} leads`}
        />
        <KpiCard
          title="Response Rate"
          value={`${overview.response_rate}%`}
          icon={TrendingUp}
          color="amber"
          subtitle={`${overview.total_replied} replies`}
          highlight={overview.response_rate >= 10}
        />
        <KpiCard
          title="Booked"
          value={overview.total_booked}
          icon={Calendar}
          color="green"
          subtitle={overview.booking_rate > 0 ? `${overview.booking_rate}% booking rate` : 'No bookings yet'}
          highlight={overview.total_booked > 0}
        />
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {funnel.length > 0 && funnel[0].count > 0 ? (
            <ConversionFunnel funnel={funnel} />
          ) : (
            <EmptyState message="No leads in the pipeline yet. Create a campaign to get started." />
          )}
        </CardContent>
      </Card>

      {/* Two-column layout: Campaign Leaderboard + Follow-up Effectiveness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Campaign Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length > 0 ? (
              <CampaignLeaderboard campaigns={campaigns} />
            ) : (
              <EmptyState message="No campaigns created yet." />
            )}
          </CardContent>
        </Card>

        {/* Follow-up Effectiveness */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              Follow-Up Effectiveness
            </CardTitle>
          </CardHeader>
          <CardContent>
            {follow_up_effectiveness.length > 0 ? (
              <FollowUpChart data={follow_up_effectiveness} />
            ) : (
              <EmptyState message="No follow-ups sent yet. Follow-ups trigger automatically after outreach." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two-column: Channel Performance + AI Closer Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Channel Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChannelComparison data={channel_performance} />
          </CardContent>
        </Card>

        {/* AI Closer Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-500" />
              AI Closer Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CloserPerformance stats={closer_stats} />
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Daily Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {daily_activity.length > 0 ? (
            <ActivityChart data={daily_activity} />
          ) : (
            <EmptyState message="No pipeline activity in this time range." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  title, value, icon: Icon, color, subtitle, highlight,
}: {
  title: string;
  value: string | number;
  icon: typeof Users;
  color: string;
  subtitle?: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        <div className={`h-8 w-8 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${c.icon}`} />
        </div>
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-green-700' : 'text-gray-900'}`}>
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Conversion Funnel ────────────────────────────────────────────────────────

function ConversionFunnel({ funnel }: { funnel: FunnelStep[] }) {
  const maxCount = funnel[0]?.count || 1;

  return (
    <div className="space-y-3">
      {funnel.map((step, i) => {
        const width = maxCount > 0 ? Math.max((step.count / maxCount) * 100, 4) : 4;
        const prevCount = i > 0 ? funnel[i - 1].count : step.count;
        const dropOff = prevCount > 0 && i > 0
          ? Math.round(((prevCount - step.count) / prevCount) * 100)
          : 0;

        return (
          <div key={step.stage} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{step.label}</span>
                {i > 0 && dropOff > 0 && (
                  <span className="text-[10px] text-gray-400">
                    −{dropOff}%
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-900">{step.count}</span>
            </div>
            <div className="h-7 bg-gray-100 rounded-lg overflow-hidden relative">
              <div
                className={`h-full ${FUNNEL_COLORS[i] || 'bg-gray-400'} rounded-lg transition-all duration-500 flex items-center`}
                style={{ width: `${width}%` }}
              >
                {width > 20 && (
                  <span className="text-[10px] font-medium text-white ml-2 whitespace-nowrap">
                    {step.count} {step.label.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
            {i < funnel.length - 1 && (
              <div className="flex justify-center my-0.5">
                <ArrowRight className="h-3 w-3 text-gray-300 rotate-90" />
              </div>
            )}
          </div>
        );
      })}

      {/* Conversion summary */}
      {funnel.length >= 2 && funnel[0].count > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">End-to-end conversion</span>
          <span className="font-semibold text-gray-900">
            {funnel[0].count > 0
              ? `${Math.round((funnel[funnel.length - 1].count / funnel[0].count) * 100)}%`
              : '0%'}
            <span className="text-gray-400 font-normal ml-1">
              ({funnel[funnel.length - 1].count} / {funnel[0].count})
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Campaign Leaderboard ─────────────────────────────────────────────────────

function CampaignLeaderboard({ campaigns }: { campaigns: CampaignMetric[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Sort by response rate desc, then by total leads
  const sorted = [...campaigns].sort((a, b) => {
    if (b.response_rate !== a.response_rate) return b.response_rate - a.response_rate;
    return b.total_leads - a.total_leads;
  });

  return (
    <div className="space-y-2">
      {sorted.map((c, i) => (
        <div key={c.id}>
          <button
            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs font-bold ${i === 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                  #{i + 1}
                </span>
                <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  c.status === 'active' || c.status === 'running'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {c.status}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">{c.response_rate}%</span>
                  <span className="text-[10px] text-gray-400 ml-1">reply</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition ${expanded === c.id ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {/* Mini stats bar */}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
              <span>{c.total_leads} leads</span>
              <span className="text-gray-300">·</span>
              <span>{c.messaged} sent</span>
              <span className="text-gray-300">·</span>
              <span className="text-amber-600">{c.replied} replied</span>
              {c.booked > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-green-600 font-medium">{c.booked} booked</span>
                </>
              )}
            </div>
          </button>

          {/* Expanded details */}
          {expanded === c.id && (
            <div className="ml-6 mt-1 mb-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400">Industry</span>
                  <p className="font-medium text-gray-700">{c.industry || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Location</span>
                  <p className="font-medium text-gray-700">{c.location || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Interested</span>
                  <p className="font-medium text-orange-600">{c.interested}</p>
                </div>
                <div>
                  <span className="text-gray-400">Closed Won</span>
                  <p className="font-medium text-emerald-600">{c.closed}</p>
                </div>
                <div>
                  <span className="text-gray-400">Skipped</span>
                  <p className="font-medium text-gray-500">{c.skipped}</p>
                </div>
                <div>
                  <span className="text-gray-400">Booking Rate</span>
                  <p className="font-medium text-green-600">{c.booking_rate}%</p>
                </div>
              </div>

              {/* Mini funnel bar */}
              <div className="mt-3 flex items-center gap-1 h-3 rounded-full overflow-hidden bg-gray-200">
                {c.total_leads > 0 && (
                  <>
                    <div className="h-full bg-amber-400 rounded-l-full" style={{ width: `${(c.messaged / c.total_leads) * 100}%` }} title="Messaged" />
                    <div className="h-full bg-orange-400" style={{ width: `${(c.replied / c.total_leads) * 100}%` }} title="Replied" />
                    <div className="h-full bg-green-400 rounded-r-full" style={{ width: `${(c.booked / c.total_leads) * 100}%` }} title="Booked" />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                <span>Messaged</span>
                <span>Replied</span>
                <span>Booked</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Follow-Up Chart ──────────────────────────────────────────────────────────

function FollowUpChart({ data }: { data: FollowUpStat[] }) {
  const maxSent = Math.max(...data.map(d => d.sent), 1);

  return (
    <div className="space-y-4">
      {data.map((d) => (
        <div key={d.follow_up_number} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center">
                {d.follow_up_number}
              </span>
              <span className="font-medium text-gray-700">
                {FOLLOW_UP_LABELS[d.follow_up_number] || `Follow-up ${d.follow_up_number}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{d.sent} sent</span>
              <span className={`text-xs font-semibold ${d.rate > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {d.rate}% reply
              </span>
            </div>
          </div>

          {/* Stacked bar: sent (gray) vs replied (green) */}
          <div className="flex items-center gap-1">
            <div className="flex-1 h-5 bg-gray-100 rounded-lg overflow-hidden flex">
              {d.sent > 0 && (
                <div
                  className="h-full bg-orange-200 transition-all duration-300"
                  style={{ width: `${(d.sent / maxSent) * 100}%` }}
                />
              )}
            </div>
            {d.replied > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium whitespace-nowrap">
                <CheckCircle2 className="h-3 w-3" />
                {d.replied} replied
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Insight */}
      {data.length >= 2 && (
        <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
          <p className="text-xs text-amber-800">
            💡 <strong>Insight:</strong>{' '}
            {getBestFollowUp(data)}
          </p>
        </div>
      )}
    </div>
  );
}

function getBestFollowUp(data: FollowUpStat[]): string {
  const withReplies = data.filter(d => d.replied > 0);
  if (withReplies.length === 0) {
    return 'Follow-ups are scheduled but no replies yet. Most B2B replies come after touch 2-3.';
  }
  const best = withReplies.reduce((a, b) => a.rate > b.rate ? a : b);
  const label = FOLLOW_UP_LABELS[best.follow_up_number] || `Follow-up ${best.follow_up_number}`;
  return `"${label}" (touch #${best.follow_up_number}) has your highest response rate at ${best.rate}%. Industry average for B2B is 5-15%.`;
}

// ─── Channel Comparison ───────────────────────────────────────────────────────

function ChannelComparison({ data }: { data: ChannelPerformance }) {
  const totalSent = data.sms.sent + data.email.sent;

  if (totalSent === 0) {
    return <EmptyState message="No outreach sent yet. Launch a campaign to see channel performance." />;
  }

  return (
    <div className="space-y-4">
      {/* SMS */}
      <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Phone className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900">SMS</span>
              <p className="text-[10px] text-gray-400">{data.sms.sent} messages sent</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-gray-900">{data.sms.rate}%</span>
            <p className="text-[10px] text-gray-400">reply rate</p>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(data.sms.rate, 100)}%` }}
          />
        </div>
      </div>

      {/* Email */}
      <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Mail className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900">Email</span>
              <p className="text-[10px] text-gray-400">{data.email.sent} messages sent</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-gray-900">{data.email.rate}%</span>
            <p className="text-[10px] text-gray-400">reply rate</p>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(data.email.rate, 100)}%` }}
          />
        </div>
      </div>

      {/* Comparison insight */}
      {data.sms.sent > 0 && data.email.sent > 0 && (
        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-800">
            💡 {data.sms.rate > data.email.rate
              ? `SMS outperforms email by ${data.sms.rate - data.email.rate}pp. Consider shifting more outreach to SMS.`
              : data.email.rate > data.sms.rate
                ? `Email outperforms SMS by ${data.email.rate - data.sms.rate}pp. Consider shifting more outreach to email.`
                : 'Both channels are performing equally. Good diversification.'
            }
          </p>
        </div>
      )}
    </div>
  );
}

// ─── AI Closer Performance ────────────────────────────────────────────────────

function CloserPerformance({ stats }: { stats: CloserStats }) {
  if (stats.total_responses === 0) {
    return (
      <div className="text-center py-6">
        <Bot className="h-10 w-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">AI Closer hasn&apos;t been activated yet.</p>
        <p className="text-xs text-gray-400 mt-1">When leads reply, the AI Closer will automatically engage.</p>
      </div>
    );
  }

  const openclawPct = stats.total_responses > 0
    ? Math.round((stats.openclaw_powered / stats.total_responses) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-purple-50 border border-purple-100 text-center">
          <div className="text-2xl font-bold text-purple-700">{stats.total_responses}</div>
          <div className="text-[10px] text-purple-500 uppercase tracking-wide mt-0.5">AI Responses</div>
        </div>
        <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-center">
          <div className="text-2xl font-bold text-green-700">{stats.stages_updated}</div>
          <div className="text-[10px] text-green-500 uppercase tracking-wide mt-0.5">Stage Updates</div>
        </div>
      </div>

      {/* OpenClaw vs Direct LLM */}
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-500">Powered by</span>
          <span className="font-medium text-gray-700">{openclawPct}% OpenClaw</span>
        </div>
        <div className="flex h-4 rounded-full overflow-hidden bg-gray-200">
          {stats.openclaw_powered > 0 && (
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center"
              style={{ width: `${openclawPct}%` }}
            >
              {openclawPct > 20 && (
                <span className="text-[9px] text-white font-medium">OpenClaw</span>
              )}
            </div>
          )}
          {stats.direct_llm > 0 && (
            <div
              className="h-full bg-gray-400 flex items-center justify-center"
              style={{ width: `${100 - openclawPct}%` }}
            >
              {(100 - openclawPct) > 20 && (
                <span className="text-[9px] text-white font-medium">Direct LLM</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
          <span>🧠 OpenClaw: {stats.openclaw_powered}</span>
          <span>⚡ Direct: {stats.direct_llm}</span>
        </div>
      </div>

      {/* Insight */}
      <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100">
        <p className="text-xs text-purple-800">
          🤖 Your AI Closer has handled {stats.total_responses} conversation{stats.total_responses !== 1 ? 's' : ''} autonomously
          {stats.openclaw_powered > 0 && ` — ${openclawPct}% powered by persistent OpenClaw agents with memory and context`}.
        </p>
      </div>
    </div>
  );
}

// ─── Activity Chart (CSS-only bar chart) ──────────────────────────────────────

function ActivityChart({ data }: { data: DailyActivity[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.created, d.messaged, d.replied]), 1);

  // Show last 14 data points max for readability
  const displayData = data.slice(-14);

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-blue-400" />
          <span className="text-gray-500">Created</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-indigo-400" />
          <span className="text-gray-500">Messaged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
          <span className="text-gray-500">Replied</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-1 h-32">
        {displayData.map((d) => {
          const dateLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' });
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  <div className="font-medium mb-0.5">{dateLabel}</div>
                  <div>Created: {d.created}</div>
                  <div>Messaged: {d.messaged}</div>
                  <div>Replied: {d.replied}</div>
                </div>
              </div>

              {/* Stacked bars */}
              <div className="w-full flex flex-col-reverse gap-px" style={{ height: '100%' }}>
                <div
                  className="w-full bg-blue-400 rounded-t-sm transition-all duration-300 min-h-0"
                  style={{ height: `${(d.created / maxVal) * 100}%`, minHeight: d.created > 0 ? '2px' : '0' }}
                />
                <div
                  className="w-full bg-indigo-400 rounded-t-sm transition-all duration-300 min-h-0"
                  style={{ height: `${(d.messaged / maxVal) * 100}%`, minHeight: d.messaged > 0 ? '2px' : '0' }}
                />
                <div
                  className="w-full bg-amber-400 rounded-t-sm transition-all duration-300 min-h-0"
                  style={{ height: `${(d.replied / maxVal) * 100}%`, minHeight: d.replied > 0 ? '2px' : '0' }}
                />
              </div>

              {/* Date label */}
              <span className="text-[9px] text-gray-400 mt-1 -rotate-45 origin-top-left whitespace-nowrap">
                {dateLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-blue-600">
            {displayData.reduce((s, d) => s + d.created, 0)}
          </div>
          <div className="text-[10px] text-gray-400">Total Created</div>
        </div>
        <div>
          <div className="text-lg font-bold text-indigo-600">
            {displayData.reduce((s, d) => s + d.messaged, 0)}
          </div>
          <div className="text-[10px] text-gray-400">Total Messaged</div>
        </div>
        <div>
          <div className="text-lg font-bold text-amber-600">
            {displayData.reduce((s, d) => s + d.replied, 0)}
          </div>
          <div className="text-[10px] text-gray-400">Total Replied</div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <BarChart3 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
